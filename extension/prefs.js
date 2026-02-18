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

        const appearanceGroup = new Adw.PreferencesGroup({
            title: 'Appearance',
            description: 'Choose which elements are visible in the top bar indicator.',
        });
        page.add(appearanceGroup);

        const notificationsGroup = new Adw.PreferencesGroup({
            title: 'Notifications',
            description: 'Control connection and disconnection alerts.',
        });
        page.add(notificationsGroup);

        const iconRow = new Adw.ActionRow({
            title: 'Show Icon',
        });
        const iconSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });
        iconRow.add_suffix(iconSwitch);
        iconRow.activatable_widget = iconSwitch;
        appearanceGroup.add(iconRow);

        settings.bind('show-icon', iconSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

        const prefixRow = new Adw.ActionRow({
            title: 'Show SSH Prefix',
        });
        const prefixSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });
        prefixRow.add_suffix(prefixSwitch);
        prefixRow.activatable_widget = prefixSwitch;
        appearanceGroup.add(prefixRow);

        settings.bind('show-prefix', prefixSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

        const notificationsRow = new Adw.ActionRow({
            title: 'Notifications',
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
    }
}
