jQuery.sap.registerModulePath("sap.it.mobile", "/sapitutils");
sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"com/sap/report/model/models",
], function (UIComponent, Device, models) {
	"use strict";

	return UIComponent.extend("com.sap.report.Component", {

		metadata: {
			version: "1.0",
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public 
		 * @override
		 */
		init: function () {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);
			// set the device model
			this.setModel(models.createDeviceModel(), "device");
			this.getRouter().initialize();
		}

	});

});