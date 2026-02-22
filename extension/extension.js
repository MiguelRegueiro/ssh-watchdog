import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const REFRESH_INTERVAL_KEY = 'refresh-interval';
const SHOW_ICON_KEY = 'show-icon';
const SHOW_PREFIX_KEY = 'show-prefix';
const SHOW_SESSION_USER_KEY = 'show-session-user';
const SHOW_SESSION_TTY_KEY = 'show-session-tty';
const SHOW_SESSION_ADDRESS_KEY = 'show-session-address';
const SHOW_NOTIFICATIONS_KEY = 'show-notifications';
const SHOW_DISCONNECT_NOTIFICATIONS_KEY = 'show-disconnect-notifications';
const ENABLE_SESSION_TERMINATION_KEY = 'enable-session-termination';
const REFRESH_INTERVAL_MIN_SECONDS = 1;
const REFRESH_INTERVAL_MAX_SECONDS = 60;
const REFRESH_INTERVAL_DEFAULT_SECONDS = 10;

const SSHWatchdogIndicator = GObject.registerClass(
class SSHWatchdogIndicator extends PanelMenu.Button {
    constructor() {
        super(0.5, 'SSH Watchdog', false);
        this._lastSessions = null;
        this._showPrefix = true;
        this._count = 0;
        this._sessions = [];
        this._currentUser = GLib.get_user_name();
        this._showConnectNotifications = true;
        this._showDisconnectNotifications = true;
        this._showSessionUser = true;
        this._showSessionTTY = true;
        this._showSessionAddress = true;
        this._whoCommand = GLib.find_program_in_path('who');
        this._whoMissingLogged = false;
        this._pkillCommand = GLib.find_program_in_path('pkill');
        this._pkillMissingLogged = false;
        this._enableSessionTermination = false;
        this._pendingTerminationTTY = null;
        this._terminatingTTYs = new Set();
        this._refreshInProgress = false;
        this._menuRefreshInProgress = false;
        this._destroyed = false;

        this._box = new St.BoxLayout({
            style_class: 'panel-status-indicators-box',
            x_expand: false,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._box.add_style_class_name('ssh-watchdog-indicator-box');
        this._icon = new St.Icon({
            icon_name: 'network-server-symbolic',
            style_class: 'system-status-icon ssh-watchdog-icon',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._label = new St.Label({
            text: 'SSH: 0',
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'ssh-watchdog-label',
        });

        this._box.add_child(this._icon);
        this._box.add_child(this._label);
        this.add_child(this._box);

        this.menu.box.add_style_class_name('ssh-watchdog-menu');
        if (typeof this.menu.setSourceAlignment === 'function')
            this.menu.setSourceAlignment(0.5);
        else
            this.menu._arrowAlignment = 0.5;

        this._headerItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });
        this._headerItem.add_style_class_name('ssh-watchdog-header-item');
        this._headerLabel = new St.Label({
            text: 'ACTIVE SESSIONS',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'ssh-watchdog-header-label',
        });
        this._headerItem.add_child(this._headerLabel);
        this.menu.addMenuItem(this._headerItem);

        this._sessionsSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._sessionsSection);

        this._updateWhoOutput([]);

        this.menu.connectObject('open-state-changed', (_menu, isOpen) => {
            if (isOpen)
                this.refreshWhoOutput();
        }, this);
    }

    _runWhoCommand() {
        return new Promise(resolve => {
            if (!this._whoCommand) {
                if (!this._whoMissingLogged) {
                    console.error('[SSH-Watchdog] `who` command not found in PATH.');
                    this._whoMissingLogged = true;
                }
                resolve('');
                return;
            }

            try {
                const subprocess = Gio.Subprocess.new(
                    [this._whoCommand],
                    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                );

                subprocess.communicate_utf8_async(null, null, (proc, res) => {
                    try {
                        const [, stdout, stderr] = proc.communicate_utf8_finish(res);
                        if (!proc.get_successful()) {
                            const stderrText = (stderr ?? '').trim();
                            console.error(`[SSH-Watchdog] who command failed: ${this._whoCommand} :: ${stderrText}`);
                            resolve('');
                            return;
                        }

                        resolve((stdout ?? '').trim());
                    } catch (error) {
                        console.error(`[SSH-Watchdog] Spawn error: ${error?.stack ?? error}`);
                        resolve('');
                    }
                });
            } catch (error) {
                console.error(`[SSH-Watchdog] Spawn error: ${error?.stack ?? error}`);
                resolve('');
            }
        });
    }

    _normalizeRemoteAddress(remoteAddress) {
        let candidate = remoteAddress.trim();

        if (candidate.startsWith('[') && candidate.endsWith(']'))
            candidate = candidate.slice(1, -1);

        const zoneIndex = candidate.indexOf('%');
        if (zoneIndex > 0)
            candidate = candidate.slice(0, zoneIndex);

        return candidate;
    }

    _parseSessionsFromWhoOutput(whoOutput) {
        if (whoOutput.length === 0)
            return [];

        const sessions = [];
        const seenSessionKeys = new Set();

        for (const line of whoOutput.split('\n')) {
            const trimmedLine = line.trim();
            if (trimmedLine.length === 0)
                continue;

            const remoteMatch = trimmedLine.match(/\(([^)]+)\)\s*$/);
            if (!remoteMatch)
                continue;

            const fields = trimmedLine.split(/\s+/);
            if (fields.length < 2)
                continue;

            const remoteAddress = this._normalizeRemoteAddress(remoteMatch[1]);
            if (!GLib.hostname_is_ip_address(remoteAddress))
                continue;

            const session = {
                user: fields[0],
                tty: fields[1],
                remoteAddress,
            };

            const sessionKey = `${session.user}::${session.tty}::${session.remoteAddress}`;
            if (seenSessionKeys.has(sessionKey))
                continue;

            seenSessionKeys.add(sessionKey);
            sessions.push(session);
        }

        sessions.sort((a, b) =>
            a.remoteAddress.localeCompare(b.remoteAddress) ||
            a.user.localeCompare(b.user) ||
            a.tty.localeCompare(b.tty)
        );

        return sessions;
    }

    async refreshCount(showConnectNotifications = true, showDisconnectNotifications = true) {
        if (this._destroyed || this._refreshInProgress)
            return;

        this._showConnectNotifications = showConnectNotifications;
        this._showDisconnectNotifications = showDisconnectNotifications;
        this._refreshInProgress = true;

        try {
            const whoOutput = await this._runWhoCommand();
            if (this._destroyed)
                return;

            const currentSessions = this._parseSessionsFromWhoOutput(whoOutput);
            this._count = currentSessions.length;
            this._sessions = currentSessions;
            this._updateIndicatorLabel();
            this._updateWhoOutput(currentSessions);

            if (this._lastSessions !== null) {
                this._notifySessionDelta(
                    this._lastSessions,
                    currentSessions,
                    showConnectNotifications,
                    showDisconnectNotifications
                );
            }

            this._lastSessions = currentSessions;
        } catch (error) {
            console.error(`[SSH-Watchdog] refreshCount() failed: ${error?.stack ?? error}`);
        } finally {
            this._refreshInProgress = false;
        }
    }

    async refreshWhoOutput() {
        if (this._destroyed || this._menuRefreshInProgress)
            return;

        this._menuRefreshInProgress = true;

        try {
            const whoOutput = await this._runWhoCommand();
            if (this._destroyed)
                return;

            const currentSessions = this._parseSessionsFromWhoOutput(whoOutput);
            this._sessions = currentSessions;
            this._updateWhoOutput(currentSessions);
        } catch (error) {
            console.error(`[SSH-Watchdog] refreshWhoOutput() failed: ${error?.stack ?? error}`);
        } finally {
            this._menuRefreshInProgress = false;
        }
    }

    _updateWhoOutput(sessions) {
        if (this._pendingTerminationTTY &&
            !sessions.some(session => session.tty === this._pendingTerminationTTY)) {
            this._pendingTerminationTTY = null;
        }

        this._sessionsSection.removeAll();

        if (sessions.length === 0) {
            this._sessionsSection.addMenuItem(this._createEmptySessionItem());
            return;
        }

        for (const session of sessions)
            this._sessionsSection.addMenuItem(this._createSessionItem(session));
    }

    _createEmptySessionItem() {
        const item = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });
        item.add_style_class_name('ssh-watchdog-session-item');

        const row = new St.BoxLayout({
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        const icon = new St.Icon({
            icon_name: 'network-idle-symbolic',
            style_class: 'popup-menu-icon',
        });
        const label = new St.Label({
            text: 'No active sessions',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'ssh-ip-label dim-label',
        });

        row.add_child(icon);
        row.add_child(label);
        item.add_child(row);

        return item;
    }

    _createSessionItem(session) {
        const item = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });
        item.add_style_class_name('ssh-watchdog-session-item');

        const row = new St.BoxLayout({
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'ssh-watchdog-session-row',
        });
        const icon = new St.Icon({
            icon_name: 'utilities-terminal-symbolic',
            style_class: 'popup-menu-icon ssh-session-terminal-icon',
        });
        const label = new St.Label({
            text: this._formatSessionLabel(session),
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'ssh-ip-label',
        });
        label.clutter_text.single_line_mode = true;
        label.clutter_text.ellipsize = Pango.EllipsizeMode.END;

        row.add_child(icon);
        row.add_child(label);

        if (this._enableSessionTermination) {
            const controls = this._createSessionControls(session);
            if (controls?.box)
                row.add_child(controls.box);
        }

        item.add_child(row);
        return item;
    }

    _createSessionControls(session) {
        const controlsBox = new St.BoxLayout({
            x_expand: false,
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.END,
            style_class: 'ssh-watchdog-session-controls',
        });

        const actionSlot = new St.BoxLayout({
            x_expand: false,
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
            style_class: 'ssh-watchdog-session-action-slot ssh-watchdog-action-slot',
        });
        controlsBox.add_child(actionSlot);

        if (!this._canTerminateSession(session)) {
            actionSlot.add_child(this._createSessionLockedStateControl());
            return {box: controlsBox};
        }

        if (this._terminatingTTYs.has(session.tty)) {
            actionSlot.add_child(this._createSessionStatusControl('ending...'));
            return {box: controlsBox};
        }

        if (this._pendingTerminationTTY === session.tty) {
            actionSlot.add_child(this._createSessionTextActionButton(
                'Confirm',
                ['destructive-action', 'ssh-session-end-confirm'],
                () => {
                    this._handleSessionTerminateRequested(session);
                }
            ));
            actionSlot.add_child(this._createSessionIconActionButton(
                'window-close-symbolic',
                'Cancel',
                ['ssh-session-end-cancel'],
                () => {
                    this._pendingTerminationTTY = null;
                    this._updateWhoOutput(this._sessions);
                }
            ));
            return {box: controlsBox};
        }

        actionSlot.add_child(this._createSessionTextActionButton(
            'End',
            ['ssh-session-end-idle'],
            () => {
                this._pendingTerminationTTY = session.tty;
                this._updateWhoOutput(this._sessions);
            }
        ));

        return {box: controlsBox};
    }

    _canTerminateSession(session) {
        return session.user === this._currentUser;
    }

    _addStyleClasses(actor, styleClasses) {
        if (!styleClasses)
            return;

        const classes = Array.isArray(styleClasses) ? styleClasses : [styleClasses];
        for (const className of classes) {
            if (typeof className === 'string' && className.length > 0)
                actor.add_style_class_name(className);
        }
    }

    _createSessionLockedStateControl() {
        const icon = new St.Icon({
            icon_name: 'system-lock-screen-symbolic',
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'popup-menu-icon ssh-session-locked-icon',
        });
        const lockButton = new St.Bin({
            x_expand: false,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'ssh-session-lock-button',
        });
        lockButton.set_child(icon);
        return lockButton;
    }

    _createSessionStatusControl(text) {
        const label = new St.Label({
            text,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'ssh-session-action-status-label dim-label',
        });
        const statusBin = new St.Bin({
            x_expand: false,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'ssh-session-action-status',
        });
        statusBin.set_child(label);
        return statusBin;
    }

    _createSessionTextActionButton(label, styleClasses, onClicked) {
        const button = new St.Button({
            label,
            reactive: true,
            can_focus: true,
            track_hover: true,
            x_expand: false,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'button ssh-session-end-button',
        });

        this._addStyleClasses(button, styleClasses);

        button.connect('clicked', () => onClicked());
        return button;
    }

    _createSessionIconActionButton(iconName, tooltipText, styleClasses, onClicked) {
        const icon = new St.Icon({
            icon_name: iconName,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'popup-menu-icon ssh-session-icon',
        });
        const button = new St.Button({
            reactive: true,
            can_focus: true,
            track_hover: true,
            x_expand: false,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'button ssh-session-icon-button',
        });
        button.set_child(icon);

        if (tooltipText.length > 0 && typeof button.set_tooltip_text === 'function')
            button.set_tooltip_text(tooltipText);

        this._addStyleClasses(button, styleClasses);

        button.connect('clicked', () => onClicked());
        return button;
    }

    _formatSessionLabel(session) {
        const parts = [];

        if (this._showSessionUser)
            parts.push(session.user);

        if (this._showSessionTTY)
            parts.push(session.tty);

        if (this._showSessionAddress)
            parts.push(session.remoteAddress);

        if (parts.length === 0)
            return `${session.user} ${session.remoteAddress}`;

        return parts.join(' ');
    }

    _isValidTTY(tty) {
        return /^[A-Za-z0-9._/-]+$/.test(tty);
    }

    async _runPkillForTTY(signal, tty) {
        if (!this._pkillCommand) {
            if (!this._pkillMissingLogged) {
                console.error('[SSH-Watchdog] `pkill` command not found in PATH.');
                this._pkillMissingLogged = true;
            }

            return {
                ok: false,
                error: '`pkill` command not found in PATH.',
            };
        }

        if (!this._isValidTTY(tty)) {
            return {
                ok: false,
                error: `Invalid tty value: ${tty}`,
            };
        }

        return new Promise(resolve => {
            try {
                const subprocess = Gio.Subprocess.new(
                    [this._pkillCommand, `-${signal}`, '-t', tty],
                    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                );

                subprocess.communicate_utf8_async(null, null, (proc, res) => {
                    try {
                        const [, stdout, stderr] = proc.communicate_utf8_finish(res);
                        const stderrText = (stderr ?? '').trim();
                        const stdoutText = (stdout ?? '').trim();

                        resolve({
                            ok: proc.get_successful(),
                            stdout: stdoutText,
                            stderr: stderrText,
                        });
                    } catch (error) {
                        resolve({
                            ok: false,
                            error: `${error}`,
                        });
                    }
                });
            } catch (error) {
                resolve({
                    ok: false,
                    error: `${error}`,
                });
            }
        });
    }

    _sleepMilliseconds(milliseconds) {
        return new Promise(resolve => {
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, milliseconds, () => {
                resolve();
                return GLib.SOURCE_REMOVE;
            });
        });
    }

    async _isSessionStillPresent(user, tty) {
        const whoOutput = await this._runWhoCommand();
        const sessions = this._parseSessionsFromWhoOutput(whoOutput);
        return sessions.some(session => session.user === user && session.tty === tty);
    }

    async _reloadStateAfterSessionAction() {
        const previousSessions = this._sessions;
        const whoOutput = await this._runWhoCommand();
        if (this._destroyed)
            return;

        const currentSessions = this._parseSessionsFromWhoOutput(whoOutput);
        this._sessions = currentSessions;
        this._count = currentSessions.length;
        this._updateIndicatorLabel();
        this._updateWhoOutput(currentSessions);

        this._notifySessionDelta(
            previousSessions,
            currentSessions,
            this._showConnectNotifications,
            this._showDisconnectNotifications
        );

        this._lastSessions = currentSessions;
    }

    async _handleSessionTerminateRequested(session) {
        if (this._destroyed || this._terminatingTTYs.has(session.tty))
            return;

        if (!this._enableSessionTermination)
            return;

        if (!this._canTerminateSession(session))
            return;

        this._pendingTerminationTTY = null;
        this._terminatingTTYs.add(session.tty);
        this._updateWhoOutput(this._sessions);

        try {
            const termResult = await this._runPkillForTTY('TERM', session.tty);
            if (!termResult.ok) {
                this._notify(
                    'SSH Watchdog',
                    `Failed to end ${session.tty}: ${termResult.error ?? termResult.stderr ?? 'unknown error'}`
                );
                return;
            }

            await this._sleepMilliseconds(800);

            const stillPresentAfterTerm = await this._isSessionStillPresent(session.user, session.tty);
            if (stillPresentAfterTerm) {
                const killResult = await this._runPkillForTTY('KILL', session.tty);
                if (!killResult.ok) {
                    this._notify(
                        'SSH Watchdog',
                        `Could not force-end ${session.tty}: ${killResult.error ?? killResult.stderr ?? 'unknown error'}`
                    );
                    return;
                }
                await this._sleepMilliseconds(300);
            }

            const stillPresentAfterKill = await this._isSessionStillPresent(session.user, session.tty);
            if (stillPresentAfterKill) {
                this._notify(
                    'SSH Watchdog',
                    `Session still active on ${session.tty}.`
                );
                return;
            }

        } catch (error) {
            this._notify(
                'SSH Watchdog',
                `Failed to end ${session.tty}: ${error}`
            );
        } finally {
            this._terminatingTTYs.delete(session.tty);
            await this._reloadStateAfterSessionAction();
        }
    }

    _notify(title, message) {
        Main.notify(title, message);
    }

    _sessionKey(session) {
        return `${session.user}::${session.tty}::${session.remoteAddress}`;
    }

    _sessionLabelForNotification(session) {
        return `${session.user} ${session.tty} ${session.remoteAddress}`;
    }

    _notifySessionDelta(previousSessions, currentSessions, showConnectNotifications, showDisconnectNotifications) {
        const previousKeys = new Set(previousSessions.map(session => this._sessionKey(session)));
        const currentKeys = new Set(currentSessions.map(session => this._sessionKey(session)));
        const connectedSessions = currentSessions.filter(session => !previousKeys.has(this._sessionKey(session)));
        const disconnectedSessions = previousSessions.filter(session => !currentKeys.has(this._sessionKey(session)));

        if (showConnectNotifications && connectedSessions.length > 0)
            this._notifyNewSessions(connectedSessions);

        if (showDisconnectNotifications && disconnectedSessions.length > 0)
            this._notifyDisconnectedSessions(disconnectedSessions);
    }

    _notifyNewSessions(newSessions) {
        for (const session of newSessions) {
            this._notify(
                'SSH Watchdog',
                `Session connected: ${this._sessionLabelForNotification(session)}`
            );
        }
    }

    _notifyDisconnectedSessions(disconnectedSessions) {
        for (const session of disconnectedSessions) {
            this._notify(
                'SSH Watchdog',
                `Session disconnected: ${this._sessionLabelForNotification(session)}`
            );
        }
    }

    _updateIndicatorLabel() {
        this._label.text = this._showPrefix ? `SSH: ${this._count}` : `${this._count}`;
    }

    setAppearance(showIcon, showPrefix) {
        this._icon.visible = showIcon;
        this._showPrefix = showPrefix;
        this._label.visible = true;
        this._label.set_style('margin-left: 0px;');
        this._updateIndicatorLabel();
    }

    setSessionTerminationEnabled(enabled) {
        this._enableSessionTermination = enabled;
        if (!enabled)
            this._pendingTerminationTTY = null;
        this._updateWhoOutput(this._sessions);
    }

    setNotificationPreferences(showConnectNotifications, showDisconnectNotifications) {
        this._showConnectNotifications = showConnectNotifications;
        this._showDisconnectNotifications = showDisconnectNotifications;
    }

    setSessionLabelVisibility(showSessionUser, showSessionTTY, showSessionAddress) {
        this._showSessionUser = showSessionUser;
        this._showSessionTTY = showSessionTTY;
        this._showSessionAddress = showSessionAddress;
        this._updateWhoOutput(this._sessions);
    }

    destroy() {
        this._destroyed = true;
        this.menu?.disconnectObject(this);

        super.destroy();
    }
});

export default class SSHWatchdogExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._indicator = null;
        this._settings = null;
        this._refreshTimeoutId = null;
    }

    enable() {
        try {
            this._settings = this.getSettings();
            this._settings.connectObject(
                `changed::${REFRESH_INTERVAL_KEY}`,
                () => this._restartRefreshLoop(),
                `changed::${SHOW_ICON_KEY}`,
                () => this._updateUI(),
                `changed::${SHOW_PREFIX_KEY}`,
                () => this._updateUI(),
                `changed::${SHOW_NOTIFICATIONS_KEY}`,
                () => this._updateUI(),
                `changed::${SHOW_DISCONNECT_NOTIFICATIONS_KEY}`,
                () => this._updateUI(),
                `changed::${SHOW_SESSION_USER_KEY}`,
                () => this._updateUI(),
                `changed::${SHOW_SESSION_TTY_KEY}`,
                () => this._updateUI(),
                `changed::${SHOW_SESSION_ADDRESS_KEY}`,
                () => this._updateUI(),
                `changed::${ENABLE_SESSION_TERMINATION_KEY}`,
                () => this._updateUI(),
                this
            );

            this._indicator = new SSHWatchdogIndicator();
            Main.panel.addToStatusArea(this.uuid, this._indicator);

            this._updateUI();
            this._indicator.refreshCount();
            this._startRefreshLoop();
        } catch (error) {
            console.error(`[SSH-Watchdog] enable() failed: ${error?.stack ?? error}`);
            this.disable();
        }
    }

    disable() {
        this._stopRefreshLoop();

        this._settings?.disconnectObject(this);
        this._settings = null;

        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }

    _getRefreshIntervalSeconds() {
        const configuredValue = this._settings?.get_int(REFRESH_INTERVAL_KEY) ?? REFRESH_INTERVAL_DEFAULT_SECONDS;
        return Math.max(
            REFRESH_INTERVAL_MIN_SECONDS,
            Math.min(REFRESH_INTERVAL_MAX_SECONDS, configuredValue)
        );
    }

    _startRefreshLoop() {
        this._stopRefreshLoop();

        const intervalSeconds = this._getRefreshIntervalSeconds();
        this._refreshTimeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            intervalSeconds,
            () => {
                const showConnectNotifications = this._settings?.get_boolean(SHOW_NOTIFICATIONS_KEY) ?? true;
                const showDisconnectNotifications = this._settings?.get_boolean(SHOW_DISCONNECT_NOTIFICATIONS_KEY) ?? true;
                this._indicator?.refreshCount(showConnectNotifications, showDisconnectNotifications);
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    _stopRefreshLoop() {
        if (this._refreshTimeoutId !== null) {
            GLib.Source.remove(this._refreshTimeoutId);
            this._refreshTimeoutId = null;
        }
    }

    _restartRefreshLoop() {
        this._startRefreshLoop();
        const showConnectNotifications = this._settings?.get_boolean(SHOW_NOTIFICATIONS_KEY) ?? true;
        const showDisconnectNotifications = this._settings?.get_boolean(SHOW_DISCONNECT_NOTIFICATIONS_KEY) ?? true;
        this._indicator?.refreshCount(showConnectNotifications, showDisconnectNotifications);
    }

    _updateUI() {
        if (!this._indicator || !this._settings)
            return;

        const configuredShowIcon = this._settings.get_boolean(SHOW_ICON_KEY);
        const configuredShowPrefix = this._settings.get_boolean(SHOW_PREFIX_KEY);
        const configuredShowSessionUser = this._settings.get_boolean(SHOW_SESSION_USER_KEY);
        const configuredShowSessionTTY = this._settings.get_boolean(SHOW_SESSION_TTY_KEY);
        const configuredShowSessionAddress = this._settings.get_boolean(SHOW_SESSION_ADDRESS_KEY);
        const configuredShowConnectNotifications = this._settings.get_boolean(SHOW_NOTIFICATIONS_KEY);
        const configuredShowDisconnectNotifications = this._settings.get_boolean(SHOW_DISCONNECT_NOTIFICATIONS_KEY);
        const configuredEnableSessionTermination = this._settings.get_boolean(ENABLE_SESSION_TERMINATION_KEY);
        this._indicator.setAppearance(configuredShowIcon, configuredShowPrefix);
        this._indicator.setNotificationPreferences(
            configuredShowConnectNotifications,
            configuredShowDisconnectNotifications
        );
        this._indicator.setSessionLabelVisibility(
            configuredShowSessionUser,
            configuredShowSessionTTY,
            configuredShowSessionAddress
        );
        this._indicator.setSessionTerminationEnabled(configuredEnableSessionTermination);
    }
}
