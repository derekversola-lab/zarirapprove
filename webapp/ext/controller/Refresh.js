/**
 * "Refresh" button on the list and on the request page (display mode):
 * reloads the data, e.g. to see a request change from Approved to Posted
 * once the background posting has finished.
 *
 * In handlers registered in manifest.json, "this" is the ExtensionAPI of the
 * page (list report or object page); both have refresh().
 */
sap.ui.define([
	"sap/m/MessageToast"
], function (MessageToast) {
	"use strict";

	return {
		onRefresh: function () {
			return Promise.resolve(this.refresh()).then(function () {
				MessageToast.show("Refreshed");
			});
		}
	};
});
