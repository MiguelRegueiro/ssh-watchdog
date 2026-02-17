import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const SETTINGS_SCHEMA_ID = 'org.gnome.shell.extensions.ssh-watchdog';

export default class SSHWatchdogPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings(SETTINGS_SCHEMA_ID);

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

        const intervalRow = new Adw.ActionRow({
            title: 'Refresh Interval',
        });

        const intervalSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 60,
                step_increment: 1,
                page_increment: 5,
            }),
            digits: 0,
            numeric: true,
            valign: Gtk.Align.CENTER,
        });

        const secondsLabel = new Gtk.Label({
            label: 'seconds',
            valign: Gtk.Align.CENTER,
            css_classes: ['dim-label'],
        });

        intervalRow.add_suffix(intervalSpin);
        intervalRow.add_suffix(secondsLabel);
        intervalRow.activatable_widget = intervalSpin;
        group.add(intervalRow);

        settings.bind('refresh-interval', intervalSpin, 'value', Gio.SettingsBindFlags.DEFAULT);
    }
}
