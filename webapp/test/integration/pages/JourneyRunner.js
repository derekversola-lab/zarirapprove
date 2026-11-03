sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"zarirapprove/test/integration/pages/RequestList.gen",
	"zarirapprove/test/integration/pages/RequestObjectPage.gen"
], function (JourneyRunner, RequestListGenerated, RequestObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('zarirapprove') + '/test/flp.html#app-preview',
        pages: {
			onTheRequestListGenerated: RequestListGenerated,
			onTheRequestObjectPageGenerated: RequestObjectPageGenerated
        },
        async: true
    });

    return runner;
});

