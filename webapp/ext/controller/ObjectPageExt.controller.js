/**
 * Object page extension for the AR invoice approval app.
 *  - Exchange Rate and Translation Date (Invoice Details) are shown only for a
 *    foreign currency request (field ShowExchangeRate, set by the backend when
 *    the document currency differs from the company code currency).
 *  - Header button "Preview" is disabled for a posted request (printed from
 *    the AR mass print). Set here because the manifest "enabled" of a header
 *    action is not applied on the object page.
 */
sap.ui.define([
	"sap/ui/core/mvc/ControllerExtension",
	"sap/ui/core/Element"
], function (ControllerExtension, Element) {
	"use strict";

	var EXCHANGE_RATE_FIELD = /FormElement::DataField::(ExchangeRate|TranslationDate)$/;

	// Bind each field's visibility to ShowExchangeRate (once per field)
	function applyExchangeRateVisibility() {
		try {
			Element.registry.filter(function (oControl) {
				return !!oControl.bindProperty && EXCHANGE_RATE_FIELD.test(oControl.getId());
			}).forEach(function (oFormElement) {
				if (!oFormElement._zarirFxBound) {
					oFormElement._zarirFxBound = true;
					oFormElement.bindProperty("visible", {
						path: "ShowExchangeRate",
						formatter: function (bShow) { return bShow === true; }
					});
				}
			});
		} catch (e) {
			// never break the page because of this
		}
	}

	// Preview: disabled when the request on the screen is posted
	function applyPreviewEnabled(oView) {
		try {
			var oContext = oView.getBindingContext();
			if (!oContext || !oContext.requestProperty) {
				return;
			}
			oContext.requestProperty(["Status", "StatusText"]).then(function (aValues) {
				var bEnabled = aValues[0] !== "P" && aValues[1] !== "Posted";
				Element.registry.filter(function (oControl) {
					return !!oControl.setEnabled && /CustomAction::PreviewPrint$/.test(oControl.getId());
				}).forEach(function (oButton) {
					if (oButton.isBound("enabled")) {
						oButton.unbindProperty("enabled", true);
					}
					oButton.setEnabled(bEnabled);
				});
			}).catch(function () { /* keep the button as it is */ });
		} catch (e) {
			// never break the page because of this
		}
	}

	// The form and header are built after the page is bound: try a few times
	function applySoon(oView) {
		[0, 300, 1000, 2500].forEach(function (iDelay) {
			setTimeout(function () {
				applyExchangeRateVisibility();
				applyPreviewEnabled(oView);
			}, iDelay);
		});
	}

	return ControllerExtension.extend("zarirapprove.ext.controller.ObjectPageExt", {
		override: {
			onInit: function () {
				var oView = this.base.getView();
				oView.addEventDelegate({ onAfterRendering: function () { applySoon(oView); } });
			},
			routing: {
				onAfterBinding: function () {
					applySoon(this.base.getView());
				}
			}
		}
	});
});
