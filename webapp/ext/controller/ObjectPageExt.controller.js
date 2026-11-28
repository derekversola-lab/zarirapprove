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

	// Withholding Tax table: shown only when the customer has withholding tax
	// (field ShowWithholdingTax, kept up to date by the backend when customer,
	// company code or posting date change). Bound to the subsection, so it
	// appears and disappears straight away; a section left without visible
	// subsections is hidden by the page itself.
	// Withholding Tax: the Tax section is one subsection, so the withholding tax
	// part is hidden piece by piece: its table (navigation _Wht) and its heading
	// "Withholding Tax". In the approver app it is a subsection of its own.
	var WHT_TABLE_ID = /::_Wht::LineItem$/;
	var WHT_SUBSECTION_ID = /FacetSubSection::WithholdingTax$/;
	var WHT_TITLE = "Withholding Tax";

	function isWithholdingTaxPart(oControl) {
		if (!oControl.bindProperty || !oControl.getId) {
			return false;
		}
		var sId = oControl.getId();
		if (WHT_TABLE_ID.test(sId) || WHT_SUBSECTION_ID.test(sId)) {
			return true;
		}
		// the heading above the table (a title, not the table's own "Withholding Taxes")
		return !!oControl.isA && oControl.isA("sap.m.Title") &&
			oControl.getText && oControl.getText() === WHT_TITLE &&
			sId.indexOf("::_Wht::") < 0;
	}

	function applyWithholdingTaxVisibility() {
		try {
			Element.registry.filter(isWithholdingTaxPart).forEach(function (oControl) {
				// Fiori elements may set its own "visible" binding: replace it once
				if (!oControl._zarirWhtBound) {
					oControl._zarirWhtBound = true;
					if (oControl.isBound("visible")) {
						oControl.unbindProperty("visible", true);
					}
					oControl.bindProperty("visible", {
						path: "ShowWithholdingTax",
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
				// Posted, reversal requested or reversed: no preview
				var bEnabled = ["P", "Q", "V"].indexOf(aValues[0]) < 0 &&
					["Posted", "Reversal Requested", "Reversed"].indexOf(aValues[1]) < 0;
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
					applyWithholdingTaxVisibility();
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
