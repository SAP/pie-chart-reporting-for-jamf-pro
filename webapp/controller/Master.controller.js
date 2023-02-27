sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "com/sap/report/services/DataService"
], function(Controller, DataService) {
	
	/**
	 * Serves as the control entity for the main view of the application,
	 * containing the list of reports. It takes care of all the application logic
	 * necessary for the MasterView. Loads all computerGroups and filters out the needed
	 * reports. Then, adds the data to the list model, so that it's displayed in the view.
	 * It also takes care of navigating to the DetailView. By default, the first Report is loaded
	 * to the detail view in the desktop version. On the mobile version only the list is visible by default.
	 * The DetailView is a separate tab.
	 */
    "use strict";
    return Controller.extend("com.sap.report.controller.Master", {
    	oDataService: null,
    	sRouteName: null,
    	
    	/**
		 * Called when the master controller is instantiated and its View controls (if available) are already created.
		 * It binds an event handler to the 'routeMatched' event and initializes the oDataService object which is used
		 * to access the necessary data.
		 * Creates a reference to the instance of the dataservice, to be able to get the necessary data.
		 * @memberOf ui5.Master
		 */
		onInit: function() {
			sap.ui.core.UIComponent.getRouterFor(this).attachRouteMatched(this.onRouteMatched, this);
			this.oDataService = DataService.getInstance();
		},
	
		/**
		 * Called when the application navigates to this route.
		 * This function initiates all data related operations. See other functions
		 * for details.
		 * @param {object} oEvt The navigation event. Containing url parameters, router properties etc.
		 */
		onRouteMatched: function(oEvt) {
			this.sRouteName = oEvt.getParameter("name");
			if (this.sRouteName !== "main" && this.sRouteName !== "Detail") {
				return;
			}
			this.getData();
		},
		
		/**
		 * Gets all the computer groups containing
		 * some kind of reporting data. Then calls processComputerGroupsData
		 * for further processing.
		 */
		getData: async function() {
			sap.ui.core.BusyIndicator.show(0); // start BusyIndicator
			
			const computerGroups = await this.oDataService.getComputerGroups()
									.catch((error) => { throw new Error(error); });
			
			this.processComputerGroupsData(computerGroups);
		},
		
		/**
		 * Processes the computer groups that are containing some kind
		 * of computer reporting data. Manipulates them to be presentable in a list format
		 * in the view and sets the appropriate data model for displaying it.
		 */
		processComputerGroupsData: function (aComputerGroups) {
			var oDataModel = new sap.ui.model.json.JSONModel();
			const aReports = this.createReportList(aComputerGroups);
			oDataModel.setData(aReports);
			this.getView().setModel(oDataModel);
			this.prepareAppPresentation(aReports);
		},
		
		/**
		 * Decides whether the application is running on a desktop or a mobile platform.
		 * If on desktop, then the first detail view is automatically selected for display.
		 */
		prepareAppPresentation: function (aReports) {
			if (this.getView().getModel("device").getProperty("/system/desktop")) {
				if (aReports.length > 0 && this.sRouteName == "main") {
					
					const navigationData = {
						group: JSON.stringify(aReports[0])
					};
					
					this.navigateToDetailView(navigationData);
					
				}
			}
		},
		
		/**
		 * Aggregates the computer reporting groups into 
		 * a set, containing all names only once. As in one reporting there are multiple
		 * groups, but the report should only be displayed once in the list.
		 */
		createReportList: function(aComputerGroups) {
			const aReports = [];
			for (const computerGroup of aComputerGroups) {
				if (!aReports.map(g => g.displayName).includes(computerGroup.displayName)) {
					aReports.push(computerGroup);
				}
			}
			
			return aReports;
		},
	
		/**
		 * Navigates to a detail view upon selection.
		 * @param {object} oEvt The navigation event. Containing url parameters, router properties etc.
		 */
		onItemPressed: function(oEvt) {
			const oData = oEvt.getSource().getBindingContext().getObject();
			const navigationData = {
				group: JSON.stringify(oData)
			};

			this.navigateToDetailView(navigationData);
	
		},
		
		/**
		 * Navigates to the provided detail view.
		 * @param {object} navigationData containing the group for which the detail view should be shown. 
		 */
		navigateToDetailView: function(navigationData) {
			sap.ui.core.UIComponent.getRouterFor(this).navTo("Detail", navigationData);
		},
	
		/**
		 * Filters the report groups according to the search value.
		 * @param {object} oEvt 
		 */
		onSearch: function(oEvt) {
			var aFilters = [];
			var searchString = oEvt.getSource().getValue();
	
			// if searchString is > 0 (-> contains content) -> filter where searchString is enclosed in "displayName" -> push all
			if (searchString && searchString.length > 0) {
				var filter = new sap.ui.model.Filter("displayName", sap.ui.model.FilterOperator.Contains, searchString);
				aFilters.push(filter);
			}
			var list = this.getView().byId("idList");
			var binding = list.getBinding("items");
			binding.filter(aFilters);

		}
    });
});
