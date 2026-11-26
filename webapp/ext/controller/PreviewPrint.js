/**
 * "Preview" on the Approve AR Invoice Requests app (same as in the requester
 * app Invoice Request).
 *  - Object page header: the request on the screen.
 *  - List report toolbar: the one selected request.
 *
 * The PDF comes from the ABAP HTTP service ZARIR_PREVIEW (class ZCL_ARIR_HTTP_PREVIEW),
 * which renders the request with the mass print renderer, print profile and form.
 * A posted request shows its posted journal entry.
 *
 * In handlers registered in manifest.json, "this" is the ExtensionAPI.
 */
sap.ui.define([
	"sap/m/MessageBox",
	"sap/m/MessageToast"
], function (MessageBox, MessageToast) {
	"use strict";

	var SERVICE_URL = "/sap/bc/http/sap/zarir_preview";

	function text(oExtensionAPI, sKey, sFallback) {
		try {
			return oExtensionAPI.getModel("i18n").getResourceBundle().getText(sKey);
		} catch (e) {
			return sFallback;
		}
	}

	// Posted (also: reversal requested, reversed)? The screens show StatusText,
	// so only StatusText is loaded for sure (Status itself is not on the
	// screen); the texts are fixed in the CDS view.
	var POSTED_STATUS = ["P", "Q", "V"];
	var POSTED_TEXT = ["Posted", "Reversal Requested", "Reversed"];
	function isPosted(oContext) {
		return POSTED_STATUS.indexOf(oContext.getProperty("Status")) >= 0 ||
			POSTED_TEXT.indexOf(oContext.getProperty("StatusText")) >= 0;
	}

	function previewUrl(oContext) {
		var sUUID = oContext.getProperty("RequestUUID");
		var bDraft = oContext.getProperty("IsActiveEntity") === false;
		var sId = oContext.getProperty("RequestID");
		// The file name only gives the browser tab a title; the service ignores it
		var sName = "Preview_" + (sId ? "IR" + sId : "Draft") + ".pdf";
		return SERVICE_URL + "/" + sName +
			"?request=" + encodeURIComponent(sUUID) +
			(bDraft ? "&draft=true" : "");
	}

	return {
		/**
		 * List report: the button is enabled only when exactly one request is selected
		 * and it is not posted yet (manifest: "enabled" of the PreviewPrint table action).
		 * A posted request is printed from the AR mass print instead.
		 */
		isSingleSelected: function (oBindingContext, aSelectedContexts) {
			return Array.isArray(aSelectedContexts) && aSelectedContexts.length === 1 &&
				!isPosted(aSelectedContexts[0]);
		},

		/**
		 * @param {sap.ui.model.odata.v4.Context} oContext object page: the request
		 * @param {sap.ui.model.odata.v4.Context[]} aSelectedContexts list report: selected rows
		 */
		onPreviewPrint: function (oContext, aSelectedContexts) {
			var oExtensionAPI = this;
			var aSelected = aSelectedContexts || [];

			if (aSelected.length > 1) {
				MessageToast.show(text(oExtensionAPI, "previewSelectOne", "Select one request to preview"));
				return;
			}
			var oRequest = aSelected[0] || oContext ||
				(oExtensionAPI.getBindingContext && oExtensionAPI.getBindingContext());
			if (!oRequest || !oRequest.getProperty("RequestUUID")) {
				MessageToast.show(text(oExtensionAPI, "previewSelectOne", "Select one request to preview"));
				return;
			}
			// Posted: print it from the AR mass print, not here
			if (isPosted(oRequest)) {
				MessageToast.show(text(oExtensionAPI, "previewPosted", "The invoice is already posted - print it from the AR mass print"));
				return;
			}

			var sUrl = previewUrl(oRequest);
			var oModel = oRequest.getModel();

			// Open the tab right away (pop-up blockers allow it only during the click),
			// then load the PDF once the draft's pending changes have reached the server.
			var oWindow = window.open("", "_blank");
			if (oWindow) {
				try {
					oWindow.document.title = text(oExtensionAPI, "previewLoading", "Preparing preview...");
					oWindow.document.body.innerHTML =
						"<p style='font-family:Arial,sans-serif;margin:2em'>" +
						text(oExtensionAPI, "previewLoading", "Preparing preview...") + "</p>";
				} catch (e) { /* tab not writable - the PDF still loads */ }
			}

			var pSent = (oRequest.getProperty("IsActiveEntity") === false && oModel.hasPendingChanges())
				? oModel.submitBatch(oModel.getUpdateGroupId())
				: Promise.resolve();

			pSent.then(function () {
				if (oWindow) {
					oWindow.location.href = sUrl;
				} else {
					window.open(sUrl, "_blank");
				}
			}).catch(function (oError) {
				if (oWindow) {
					oWindow.close();
				}
				MessageBox.error((oError && oError.message) ||
					text(oExtensionAPI, "previewFailed", "The preview could not be created"));
			});
		}
	};
});
