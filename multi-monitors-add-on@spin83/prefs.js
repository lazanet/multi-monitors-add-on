/*
Copyright (C) 2014  spin83

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, visit https://www.gnu.org/licenses/.
*/

import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export const SHOW_INDICATOR_ID = 'show-indicator';
export const SHOW_PANEL_ID = 'show-panel';
export const SHOW_ACTIVITIES_ID = 'show-activities';
export const SHOW_APP_MENU_ID = 'show-app-menu';
export const SHOW_DATE_TIME_ID = 'show-date-time';
export const AVAILABLE_INDICATORS_ID = 'available-indicators';
export const TRANSFER_INDICATORS_ID = 'transfer-indicators';
export const ENABLE_HOT_CORNERS = 'enable-hot-corners';

const Columns = {
    INDICATOR_NAME: 0,
    MONITOR_NUMBER: 1
};


export var MultiMonitorsPrefsWidget = GObject.registerClass(
class MultiMonitorsPrefsWidget extends Gtk.Grid {
    _init(p) {
        super._init({
            margin_top: 6, margin_end: 6, margin_bottom: 6, margin_start: 6
        });

        this._numRows = 0;

        this.set_orientation(Gtk.Orientation.VERTICAL);

        this._settings = p.getSettings();
        this._desktopSettings = p.getSettings("org.gnome.desktop.interface");

        this._display = Gdk.Display.get_default();
        this._monitors = this._display.get_monitors()

        this._addBooleanSwitch(_('Show Multi Monitors indicator on Top Panel.'), SHOW_INDICATOR_ID);
        this._addBooleanSwitch(_('Show Panel on additional monitors.'), SHOW_PANEL_ID);

        this._addSettingsBooleanSwitch(_('Enable hot corners.'), this._desktopSettings, ENABLE_HOT_CORNERS);

        this._store = new Gtk.ListStore();
        this._store.set_column_types([GObject.TYPE_STRING, GObject.TYPE_INT]);

        this._treeView = new Gtk.TreeView({ model: this._store, hexpand: true, vexpand: true });
        this._treeView.get_selection().set_mode(Gtk.SelectionMode.SINGLE);

        let appColumn = new Gtk.TreeViewColumn({ expand: true, sort_column_id: Columns.INDICATOR_NAME,
                                                 title: _("A list of indicators for transfer to additional monitors.") });

        let nameRenderer = new Gtk.CellRendererText;
        appColumn.pack_start(nameRenderer, true);
        appColumn.add_attribute(nameRenderer, "text", Columns.INDICATOR_NAME);

        nameRenderer = new Gtk.CellRendererText;
        appColumn.pack_start(nameRenderer, true);
        appColumn.add_attribute(nameRenderer, "text", Columns.MONITOR_NUMBER);
        
        this._treeView.append_column(appColumn);
        this.add(this._treeView);

        let toolbar = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
        toolbar.get_style_context().add_class("inline-toolbar");

        this._settings.connect('changed::'+TRANSFER_INDICATORS_ID, this._updateIndicators.bind(this));
        this._updateIndicators();

        let addTButton = new Gtk.Button({ icon_name: "list-add" });
        addTButton.connect('clicked', this._addIndicator.bind(this));
        toolbar.append(addTButton);

        let removeTButton = new Gtk.Button({ icon_name: "list-remove" });
        removeTButton.connect('clicked', this._removeIndicator.bind(this));
        toolbar.append(removeTButton);
        
        this.add(toolbar);
    }

    add(child) {
        this.attach(child, 0, this._numRows++, 1, 1);
    }

    _updateIndicators() {
    	this._store.clear();
    	
    	let transfers = this._settings.get_value(TRANSFER_INDICATORS_ID).deep_unpack();

		for(let indicator in transfers) {
			if(transfers.hasOwnProperty(indicator)){
				let monitor = transfers[indicator];
	            let iter = this._store.append();
	            this._store.set(iter, [Columns.INDICATOR_NAME, Columns.MONITOR_NUMBER], [indicator, monitor]);
			}
		}
	}
    
    _addIndicator() {
	
    	let dialog = new Gtk.Dialog({ title: _("Select indicator"),
            									transient_for: this.get_toplevel(), modal: true });
    	dialog.add_button(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL);
    	dialog.add_button(_("Add"), Gtk.ResponseType.OK);
    	dialog.set_default_response(Gtk.ResponseType.OK);

    	let grid = new Gtk.Grid({ column_spacing: 10, row_spacing: 15,
                margin_top: 10, margin_end: 10, margin_bottom: 10, margin_start: 10 });
    	
    	grid.set_orientation(Gtk.Orientation.VERTICAL);
    	
    	dialog._store = new Gtk.ListStore();
    	dialog._store.set_column_types([GObject.TYPE_STRING]);		

    	dialog._treeView = new Gtk.TreeView({ model: dialog._store, hexpand: true, vexpand: true });
    	dialog._treeView.get_selection().set_mode(Gtk.SelectionMode.SINGLE);

        let appColumn = new Gtk.TreeViewColumn({ expand: true, sort_column_id: Columns.INDICATOR_NAME,
                                                 title: _("Indicators on Top Panel") });
        
        let nameRenderer = new Gtk.CellRendererText;
        appColumn.pack_start(nameRenderer, true);
        appColumn.add_attribute(nameRenderer, "text", Columns.INDICATOR_NAME);        

        dialog._treeView.append_column(appColumn);
        
        let availableIndicators = () => {
        	let transfers = this._settings.get_value(TRANSFER_INDICATORS_ID).unpack();
    		dialog._store.clear();
    		this._settings.get_strv(AVAILABLE_INDICATORS_ID).forEach((indicator) => {
    			if(!transfers.hasOwnProperty(indicator)){
        			let iter = dialog._store.append();
        			dialog._store.set(iter, [Columns.INDICATOR_NAME], [indicator]);
    			}
    		});
        };
        
        let availableIndicatorsId = this._settings.connect('changed::'+AVAILABLE_INDICATORS_ID,
        													availableIndicators);
        let transferIndicatorsId = this._settings.connect('changed::'+TRANSFER_INDICATORS_ID,
															availableIndicators);
        
        availableIndicators.apply(this);
    	grid.attach(dialog._treeView, 0, 0, 2, 1);
    	
		let gHBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL,
                margin_top: 10, margin_end: 10, margin_bottom: 10, margin_start: 10,
                spacing: 20, hexpand: true});
		let gLabel = new Gtk.Label({label: _('Monitor index:'), halign: Gtk.Align.START});
		gHBox.append(gLabel);
		dialog._adjustment = new Gtk.Adjustment({lower: 0.0, upper: 0.0, step_increment:1.0});
		let spinButton = new Gtk.SpinButton({halign: Gtk.Align.END, adjustment: dialog._adjustment, numeric: 1});
		gHBox.append(spinButton);
		
		let monitorsChanged = () => {
			let n_monitors = this._monitors.get_n_items() -1;
			dialog._adjustment.set_upper(n_monitors)
			dialog._adjustment.set_value(n_monitors);
		};
		
		let monitorsChangedId = this._monitors.connect('items-changed', monitorsChanged);

		monitorsChanged.apply(this);
		grid.append(gHBox);
    	
    	dialog.get_content_area().append(grid);

    	dialog.connect('response', (dialog, id) => {
    		this._monitors.disconnect(monitorsChangedId);
    		this._settings.disconnect(availableIndicatorsId);
    		this._settings.disconnect(transferIndicatorsId);
			if (id != Gtk.ResponseType.OK) {
				dialog.destroy();
				return;
			}
			
	        let [any, model, iter] = dialog._treeView.get_selection().get_selected();
	        if (any) {
	        	let indicator = model.get_value(iter, Columns.INDICATOR_NAME);
	        	
	        	let transfers = this._settings.get_value(TRANSFER_INDICATORS_ID).deep_unpack();
	        	if(!transfers.hasOwnProperty(indicator)){
	        		transfers[indicator] = dialog._adjustment.get_value();
	            	this._settings.set_value(TRANSFER_INDICATORS_ID, new GLib.Variant('a{si}', transfers));
	        	}
	        }

			dialog.destroy();
		});
    }
    
    _removeIndicator() {
        let [any, model, iter] = this._treeView.get_selection().get_selected();
        if (any) {
        	let indicator = model.get_value(iter, Columns.INDICATOR_NAME);
        	
        	let transfers = this._settings.get_value(TRANSFER_INDICATORS_ID).deep_unpack();
        	if(transfers.hasOwnProperty(indicator)){
        		delete transfers[indicator];
            	this._settings.set_value(TRANSFER_INDICATORS_ID, new GLib.Variant('a{si}', transfers));
        	}
        }
    }

	_addComboBoxSwitch(label, schema_id, options) {
		this._addSettingsComboBoxSwitch(label, this._settings, schema_id, options)
	}

	_addSettingsComboBoxSwitch(label, settings, schema_id, options) {
		let gHBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL,
                margin_top: 10, margin_end: 10, margin_bottom: 10, margin_start: 10,
                spacing: 20, hexpand: true});
		let gLabel = new Gtk.Label({label: _(label), halign: Gtk.Align.START});
		gHBox.append(gLabel);

		let gCBox = new Gtk.ComboBoxText({halign: Gtk.Align.END});
		Object.entries(options).forEach(function(entry) {
			const [key, val] = entry;
			gCBox.append(key, val);
		});
		gHBox.append(gCBox);

		this.add(gHBox);

		settings.bind(schema_id, gCBox, 'active-id', Gio.SettingsBindFlags.DEFAULT);
	}

    _addBooleanSwitch(label, schema_id) {
        this._addSettingsBooleanSwitch(label, this._settings, schema_id);
    }

    _addSettingsBooleanSwitch(label, settings, schema_id) {
        let gHBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL,
                margin_top: 10, margin_end: 10, margin_bottom: 10, margin_start: 10,
                spacing: 20, hexpand: true});
        let gLabel = new Gtk.Label({label: _(label), halign: Gtk.Align.START});
        gHBox.append(gLabel);
        let gSwitch = new Gtk.Switch({halign: Gtk.Align.END});
        gHBox.append(gSwitch);
        this.add(gHBox);

        settings.bind(schema_id, gSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
    }
});

export default class MultiMonitorsPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window._settings = this.getSettings();

        let page = new Adw.PreferencesPage();
        let group = new Adw.PreferencesGroup();

        let widget = new MultiMonitorsPrefsWidget(this);
        group.add(widget);
        page.add(group);
        window.add(page);
    }
}
