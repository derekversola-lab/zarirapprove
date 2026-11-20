/**
 * Object page extension for the AR invoice approval app.
 *  - Exchange Rate and Translation Date (Invoice Details) are shown only for a
 *    foreign currency request (field ShowExchangeRate, set by the backend when
 *    the document currency differs from the company code currency).
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

	// The form is built after the page is bound: try a few times
	function applySoon() {
		[0, 300, 1000, 2500].forEach(function (iDelay) {
			setTimeout(applyExchangeRateVisibility, iDelay);
		});
	}

	return ControllerExtension.extend("zarirapprove.ext.controller.ObjectPageExt", {
		override: {
			onInit: function () {
				this.base.getView().addEventDelegate({ onAfterRendering: applySoon });
			},
			routing: {
				onAfterBinding: function () {
					applySoon();
				}
			}
		}
	});
});
