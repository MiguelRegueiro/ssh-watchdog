import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const SETTINGS_SCHEMA_ID = 'org.gnome.shell.extensions.ssh-watchdog';
const REFRESH_INTERVAL_KEY = 'refresh-interval';
const SHOW_ICON_KEY = 'show-icon';
const SHOW_PREFIX_KEY = 'show-prefix';
const SHOW_NOTIFICATIONS_KEY = 'show-notifications';
const SHOW_DISCONNECT_NOTIFICATIONS_KEY = 'show-disconnect-notifications';
const REFRESH_INTERVAL_MIN_SECONDS = 1;
const REFRESH_INTERVAL_MAX_SECONDS = 60;
const REFRESH_INTERVAL_DEFAULT_SECONDS = 10;
const DECODER = new TextDecoder();
const SSH_UNIQUE_MENU_COMMAND = "/usr/bin/who | /usr/bin/grep -oP '\\(\\K[\\d\\.]+' | /usr/bin/sort -u";

const SSHWatchdogIndicator = GObject.registerClass(
class SSHWatchdogIndicator extends PanelMenu.Button {
    constructor() {
        super(0.0, 'SSH Watchdog', false);
        this._lastCount = null;
        this._lastIPs = [];
        this._showPrefix = true;
        this._count = 0;

        this._box = new St.BoxLayout({style_class: 'panel-status-menu-box'});
        this._box.set_style('spacing: 0px;');
        this._icon = new St.Icon({
            icon_name: 'network-server-symbolic',
            style_class: 'system-status-icon',
            style: 'margin-right: 0px;',
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
        this._headerItem.add_style_class_name('system-status-menu-list-item');
        this._headerLabel = new St.Label({
            text: 'ACTIVE SESSIONS',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'system-status-menu-list-item',
        });
        this._headerItem.add_child(this._headerLabel);
        this.menu.addMenuItem(this._headerItem);

        this._sessionsSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._sessionsSection);

        this._updateWhoOutput([]);

        this.menu.connect('open-state-changed', (_menu, isOpen) => {
            if (isOpen)
                this.refreshWhoOutput();
        });
    }

    _runCommand(command) {
        try {
            // Use sync spawn to avoid D-Bus/systemd transient-scope issues in nested sessions.
            const escapedCommand = GLib.shell_quote(command);
            const shellCommand = `/bin/bash -c ${escapedCommand}`;
            const [success, stdout, stderr] = GLib.spawn_command_line_sync(shellCommand);
            if (!success) {
                const stderrText = stderr ? DECODER.decode(stderr).trim() : '';
                console.error(`[SSH-Watchdog] Command failed: ${command} :: ${stderrText}`);
                return '';
            }
            return stdout ? DECODER.decode(stdout).trim() : '';
        } catch (error) {
            console.error(`[SSH-Watchdog] Spawn error: ${error?.stack ?? error}`);
            return '';
        }
    }

    refreshCount(showConnectNotifications = true, showDisconnectNotifications = true) {
        const ipOutput = this._runCommand(SSH_UNIQUE_MENU_COMMAND);
        const currentIPs = ipOutput.length > 0
            ? ipOutput.split('\n').filter(line => line.length > 0)
            : [];
        const count = currentIPs.length;

        this._count = count;
        this._updateIndicatorLabel();
        this._updateWhoOutput(currentIPs);

        if (this._lastCount !== null) {
            const connected = currentIPs.filter(ip => !this._lastIPs.includes(ip));
            const disconnected = this._lastIPs.filter(ip => !currentIPs.includes(ip));

            if (showConnectNotifications && connected.length > 0)
                this._notifyNewSessions(connected);

            if (showDisconnectNotifications && disconnected.length > 0)
                this._notifyDisconnectedSessions(disconnected);
        }

        this._lastCount = count;
        this._lastIPs = currentIPs;
    }

    refreshWhoOutput() {
        const ipOutput = this._runCommand(SSH_UNIQUE_MENU_COMMAND);
        const currentIPs = ipOutput.length > 0
            ? ipOutput.split('\n').filter(line => line.length > 0)
            : [];
        this._updateWhoOutput(currentIPs);
    }

    _updateWhoOutput(ips) {
        this._sessionsSection.removeAll();

        if (ips.length === 0) {
            this._sessionsSection.addMenuItem(this._createSessionItem(
                'No active sessions',
                'security-low-symbolic',
                true
            ));
            return;
        }

        for (const ip of ips)
            this._sessionsSection.addMenuItem(this._createSessionItem(ip, 'utilities-terminal-symbolic'));
    }

    _createSessionItem(text, iconName, isDimmed = false) {
        const item = new PopupMenu.PopupMenuItem('', {
            reactive: false,
            can_focus: false,
        });
        item.label.visible = false;

        const row = new St.BoxLayout({
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        const icon = new St.Icon({
            icon_name: iconName,
            style_class: 'popup-menu-icon',
        });
        const label = new St.Label({
            text,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: isDimmed ? 'ssh-ip-label dim-label' : 'ssh-ip-label',
        });

        row.add_child(icon);
        row.add_child(label);
        item.add_child(row);

        return item;
    }

    _notifyWithIcon(title, message, iconName) {
        const gicon = new Gio.ThemedIcon({name: iconName});

        try {
            let source;
            try {
                source = new MessageTray.Source({
                    title,
                    icon: gicon,
                });
            } catch {
                source = new MessageTray.Source(title, iconName);
            }

            Main.messageTray.add(source);

            let notification;
            try {
                notification = new MessageTray.Notification({
                    source,
                    title,
                    body: message,
                    gicon,
                    isTransient: true,
                });
            } catch {
                notification = new MessageTray.Notification(source, title, message);
                notification.setTransient(true);
            }

            source.addNotification(notification);
            return;
        } catch (error) {
            console.error(`[SSH-Watchdog] Icon notification fallback: ${error?.stack ?? error}`);
        }

        Main.notify(title, message);
    }

    _notifyNewSessions(newIPs) {
        const plural = newIPs.length === 1 ? '' : 's';
        this._notifyWithIcon(
            'SSH Watchdog',
            `New SSH session${plural} from: ${newIPs.join(', ')}`,
            'network-server-symbolic'
        );
    }

    _notifyDisconnectedSessions(disconnectedIPs) {
        for (const ip of disconnectedIPs) {
            this._notifyWithIcon(
                'SSH Watchdog',
                `Session closed: ${ip}`,
                'network-offline-symbolic'
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
});

export default class SSHWatchdogExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._indicator = null;
        this._settings = null;
        this._settingsSignalIds = [];
        this._refreshTimeoutId = null;
        this.init();
    }

    init() {
    }

    enable() {
        try {
            this._settings = this.getSettings(SETTINGS_SCHEMA_ID);
            this._settingsSignalIds.push(this._settings.connect(
                `changed::${REFRESH_INTERVAL_KEY}`,
                () => this._restartRefreshLoop()
            ));
            this._settingsSignalIds.push(this._settings.connect(
                `changed::${SHOW_ICON_KEY}`,
                () => this._updateUI()
            ));
            this._settingsSignalIds.push(this._settings.connect(
                `changed::${SHOW_PREFIX_KEY}`,
                () => this._updateUI()
            ));

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

        if (this._settings) {
            for (const signalId of this._settingsSignalIds)
                this._settings.disconnect(signalId);
        }
        this._settingsSignalIds = [];
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
        this._indicator.setAppearance(configuredShowIcon, configuredShowPrefix);
    }
}
