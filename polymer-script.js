(function() {
    "use strict";

    var DEFAULT_ROUTE = 'run_instance';

    var template = document.querySelector('#t');

    template.pages = [
        {name: 'Run instance', hash: 'run_instance'},
        {name: 'Search history', hash: 'search_history'},
        {name: 'Collect statistics', hash: 'statistics_collect'}
    ];

    template.inputFiles = [];

    template.addEventListener('template-bound', function(e) {
        // Use URL hash for initial root, otherwise - the first page
        this.route = this.route || DEFAULT_ROUTE;

        var that = this;
        this.$.requestFiles.request({url: '/api/files', method: 'GET',
                                     callback: function(response, err) {
                                         that.inputFiles = JSON.parse(response);
                                         console.log(that.inputFiles);
                                     }});
    });

    template.menuItemSelected = function(e, detail, sender) {
        if (detail.isSelected) {
            document.querySelector('#scaffold').closeDrawer();
        }
    };

    template.messages = [];
    template.runs = [];

    template.addMessage = function(e, detail, sender) {
        console.log("smth");
    };

})();
