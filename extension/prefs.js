import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class SSHWatchdogPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'preferences-system-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: 'Monitoring',
            description: 'Configure how often SSH sessions are checked.',
        });
        page.add(group);

        const intervalRow = new Adw.SpinRow({
            title: 'Refresh Interval',
            subtitle: 'seconds',
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 60,
                step_increment: 1,
                page_increment: 5,
            }),
            climb_rate: 1,
            digits: 0,
            numeric: true,
            snap_to_ticks: true,
        });
        group.add(intervalRow);

        settings.bind('refresh-interval', intervalRow, 'value', Gio.SettingsBindFlags.DEFAULT);

        const topBarGroup = new Adw.PreferencesGroup({
            title: 'Top Bar',
            description: 'Choose which elements are visible in the top bar indicator.',
        });

        const notificationsGroup = new Adw.PreferencesGroup({
            title: 'Alerts',
            description: 'Control connection and disconnection alerts.',
        });

        const sessionDisplayGroup = new Adw.PreferencesGroup({
            title: 'Session List',
            description: 'Choose which details appear in each active session row.',
        });

        const sessionControlGroup = new Adw.PreferencesGroup({
            title: 'Session Control',
            description: 'Optional controls for ending sessions from the extension menu.',
        });

        page.add(notificationsGroup);
        page.add(topBarGroup);
        page.add(sessionDisplayGroup);
        page.add(sessionControlGroup);

        const iconRow = new Adw.ActionRow({
            title: 'Show Icon',
        });
        const iconSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });
        iconRow.add_suffix(iconSwitch);
        iconRow.activatable_widget = iconSwitch;
        topBarGroup.add(iconRow);

        settings.bind('show-icon', iconSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

        const prefixRow = new Adw.ActionRow({
            title: 'Show SSH Prefix',
        });
        const prefixSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });
        prefixRow.add_suffix(prefixSwitch);
        prefixRow.activatable_widget = prefixSwitch;
        topBarGroup.add(prefixRow);

        settings.bind('show-prefix', prefixSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

        const notificationsRow = new Adw.ActionRow({
            title: 'Connection Alerts',
        });
        const notificationsSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });
        notificationsRow.add_suffix(notificationsSwitch);
        notificationsRow.activatable_widget = notificationsSwitch;
        notificationsGroup.add(notificationsRow);

        settings.bind('show-notifications', notificationsSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

        const disconnectNotificationsRow = new Adw.ActionRow({
            title: 'Disconnection Alerts',
        });
        const disconnectNotificationsSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });
        disconnectNotificationsRow.add_suffix(disconnectNotificationsSwitch);
        disconnectNotificationsRow.activatable_widget = disconnectNotificationsSwitch;
        notificationsGroup.add(disconnectNotificationsRow);

        settings.bind('show-disconnect-notifications', disconnectNotificationsSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

        const sessionTerminationRow = new Adw.ActionRow({
            title: 'Enable Session Termination',
            subtitle: 'Allows ending sessions owned by the current user from the menu.',
        });
        const sessionTerminationSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });
        sessionTerminationRow.add_suffix(sessionTerminationSwitch);
        sessionTerminationRow.activatable_widget = sessionTerminationSwitch;
        sessionControlGroup.add(sessionTerminationRow);

        settings.bind('enable-session-termination', sessionTerminationSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

        const sessionUserRow = new Adw.ActionRow({
            title: 'Show User',
        });
        const sessionUserSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });
        sessionUserRow.add_suffix(sessionUserSwitch);
        sessionUserRow.activatable_widget = sessionUserSwitch;
        sessionDisplayGroup.add(sessionUserRow);
        settings.bind('show-session-user', sessionUserSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

        const sessionTTYRow = new Adw.ActionRow({
            title: 'Show TTY',
        });
        const sessionTTYSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });
        sessionTTYRow.add_suffix(sessionTTYSwitch);
        sessionTTYRow.activatable_widget = sessionTTYSwitch;
        sessionDisplayGroup.add(sessionTTYRow);
        settings.bind('show-session-tty', sessionTTYSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

        const sessionAddressRow = new Adw.ActionRow({
            title: 'Show Remote IP',
        });
        const sessionAddressSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });
        sessionAddressRow.add_suffix(sessionAddressSwitch);
        sessionAddressRow.activatable_widget = sessionAddressSwitch;
        sessionDisplayGroup.add(sessionAddressRow);
        settings.bind('show-session-address', sessionAddressSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

        const ensureAtLeastOneSessionField = toggledSwitch => {
            if (sessionUserSwitch.active || sessionTTYSwitch.active || sessionAddressSwitch.active)
                return;

            toggledSwitch.active = true;
        };

        sessionUserSwitch.connect('notify::active', () => ensureAtLeastOneSessionField(sessionUserSwitch));
        sessionTTYSwitch.connect('notify::active', () => ensureAtLeastOneSessionField(sessionTTYSwitch));
        sessionAddressSwitch.connect('notify::active', () => ensureAtLeastOneSessionField(sessionAddressSwitch));
    }
}
