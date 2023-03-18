sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "com/sap/report/services/DataService"
], function(Controller, DataService) {
	
	/**
	 * Serves as the control entity for the detail view of the application.
	 * It takes care of all the application logic necessary for the DetailView.
	 * Loads all computerGroups and filters out the needed ones. Then the detail data
	 * is requested for all selected computer groups. Finally the data is displayed
	 * in a pie chart.
	 */
    "use strict";
    return Controller.extend("com.sap.report.controller.Detail", {
    	
    	dataService: null,
		aComputerGroupsData: null,
    	displayPercentage: false,
        
        /**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * It creates a reference to the data service instance to be able to get the necessary data.
		 * It registers a handler for the routeMatched event.
		 * @memberOf ui5.Empty
		 */
		onInit: function() {
			var oModel = new sap.ui.model.json.JSONModel();
			// add new model for dynamic title
			var oViewModel = new sap.ui.model.json.JSONModel();
			oModel.setDefaultBindingMode(sap.ui.model.BindingMode.OneWay);
			this.getView().setModel(oModel);
			// add for new dynamic title (title= "Managed Clients: {view>/clients}" -- in Intro.view)
			this.getView().setModel(oViewModel, "view");
			sap.ui.core.UIComponent.getRouterFor(this).attachRouteMatched(this.onRouteMatched, this);
			
			this.dataService = DataService.getInstance();
		},
		
		/**
		 * Called when the application navigates to this route.
		 * This function initiates all data related operations. See other functions
		 * for details.
		 * @param {object} oEvt The navigation event. Containing url parameters, router properties etc.
		 */
		onRouteMatched: function(oEvt) {
			var sRouteName = oEvt.getParameter("name");
			if (sRouteName !== "Detail") return;

			this.oGroup = JSON.parse(oEvt.getParameter("arguments").group);
			this.getData();
		},
	
		
		/**
		 * Gets all the computer groups containing
		 * some kind of reporting data. Also gets the amount
		 * of currently managed computers/clients.
		 * Then calls processComputerGroupsData
		 * for further processing.
		 */
		getData: async function(reload) {
			sap.ui.core.BusyIndicator.show(0); // start BusyIndicator
			this.getNumberOfManagedComputers(reload);
			
			this.computerGroups = await this.getComputerGroups(reload);

			this.processComputerGroupsData(this.computerGroups, reload);
	
		},
		
		/**
		 * Gets all the computer groups containing
		 * some kind of reporting data.
		 * @param {boolean} reload If true, the dat is requested again from the server.
		 */
		getComputerGroups: async function(reload) {
			return this.dataService.getComputerGroups(reload);
		},
		
		/**
		 * Filters out the needed computer groups that are in the appropriate report.
		 * Loads the detailed data for the filtered out computer groups.
		 * Calls function to create a pie chart with the data.
		 * @param {array} aComputerGroups Contains all the report computer groups.
		 * @param {boolean} reload If true, the data is requested again from the server.
		 */
		processComputerGroupsData: async function(aComputerGroups, reload) {
	
			// Create model with all computergroups in this report
			const oDetailedComputerGroupsModel = new sap.ui.model.json.JSONModel();
	
			// Filter all computergroups by name (position [2] / after second pipe (|)
			const aReportComputerGroups = this.dataService.filterComputerGroupsByName(aComputerGroups, this.oGroup.displayName, 1);
			
			const aDetailedComputerGroups = await this.getComputerGroupsInformation(aReportComputerGroups, reload);
			oDetailedComputerGroupsModel.setData(aDetailedComputerGroups);
			this.getView().setModel(oDetailedComputerGroupsModel);
			const legend = {
				title: {
						visible: "true",
						text: "Type | Clients"
				}
			};
			this.createPieChart(oDetailedComputerGroupsModel, legend);
			this.handlePercentagesDisplay();

			sap.ui.core.BusyIndicator.hide(); // stop BusyIndicator
	
		},
		
		/**
		 * Creates a pie chart to display the supplied data.
		 * @param {object} oDetailedComputerGroupsModel The object containing
		 * detailed data of the computergroups needed for this pie chart.
		 */
		createPieChart: function(oDetailedComputerGroupsModel, legend, dataLabel) {
			var oVizFrame = this.getView().byId("idVizFrame");
			const sTitle = this.oGroup.displayName;
			const sSubtitle = this.oGroup.subTitle;

			oVizFrame.setVizProperties({
				legend,
				legendGroup: {
					layout: {
						maxWidth: 0.4,
						width: 0.3
					},
					alignment: "topRight"
				},
				dataLabel,
				title: {
					visible: "true",
					text: sTitle + " " + sSubtitle
				}
			});
	
			oVizFrame.setModel(oDetailedComputerGroupsModel);

			var oPopOver = this.getView().byId("idPopOver");
			oPopOver.connect(oVizFrame.getVizUid());
			
		},
	
		/**
		 * Gets the number of currently managed computers.
		 * @param {boolean} reload If true, the data is requested again from the server.
		 */
		getNumberOfManagedComputers: async function(reload) {
			const numberOfComputers = await this.dataService.getNumberOfManagedComputers(reload)
								.catch((error) => { throw new Error(error); });
			
			this.getView().getModel("view").setProperty("/clients", numberOfComputers);
	
		},
	
		/**
		 * Gets detailed data about computer groups like:
		 * name, amount (length) and criteria.
		 * @param {array} aComputerGroups The array containing all computer groups of interest.
		 * @param {boolean} reload If true, the data is requested again from the server.
		 */
		getComputerGroupsInformation: async function(aComputerGroups, reload) {
			const aComputerGroupPromises = [];
			
			for (const computerGroup of aComputerGroups) {
				aComputerGroupPromises.push(this.dataService.getOneComputerGroupDetail(computerGroup.id, reload));
			}
			
			this.aComputerGroupsData = await Promise.all(aComputerGroupPromises);
			
			const aPreparedComputerGroups = this.prepareComputerGroupsForPieChart(this.aComputerGroupsData);

			return aPreparedComputerGroups;
		},
		
		/**
		 * Prepares the computerGroups for the pie chart.
		 * The individual group names are split on the '|'s and
		 * for the legend of the pie chart. The group's size is 
		 * also added to the displayed object.
		 * 
		 */
		prepareComputerGroupsForPieChart: function(aComputerGroupsData, displayPercentage) {
			const aPreparedComputerGroups = [];

			let allComputers = 0;
			for (let cg of aComputerGroupsData) allComputers += cg.computers.length;

			for (const oComputerGroup of aComputerGroupsData) {
				// for legend: Split on position [2] 
				var sName = oComputerGroup.name;
				var sSize = oComputerGroup.computers.length;
				var sPercentage = oComputerGroup.computers.length / allComputers;

				var aNames = sName.split("|");

				if (aNames.length > 3) {
					sName = aNames[3];
				} else {
					sName = aNames[2];
				}
				var oPreparedComputerGroup = {
					"name": sName + " | " + sSize + (displayPercentage ? " | " + sPercentage.toLocaleString(undefined, {style: "percent", maximumFractionDigits: 1}) : ""),
					"computer": sSize
				};
				oPreparedComputerGroup["percentage"] = displayPercentage ? sPercentage : null;

				if (sSize > 0) {
					aPreparedComputerGroups.push(oPreparedComputerGroup);
				}
	
			}
			
			return aPreparedComputerGroups;
		},

		handlePercentagesDisplay: async function() {
			
			this.displayPercentage = this.getView().byId("percentageToggle").mProperties["pressed"];
			
			const oDetailedComputerGroupsModel = new sap.ui.model.json.JSONModel();
			let legend = {};
			let dataLabel = {};
			let aDetailedComputerGroups = [];

			aDetailedComputerGroups = this.prepareComputerGroupsForPieChart(this.aComputerGroupsData, this.displayPercentage);
			oDetailedComputerGroupsModel.setData(aDetailedComputerGroups);
			this.getView().setModel(oDetailedComputerGroupsModel);
			legend = {
				title: {
					visible: "true",
					text: "Type | Clients" + (this.displayPercentage ? " | Percentage" : "")
				}
			};
			dataLabel = {
				visible: false
			};
			
			this.createPieChart(oDetailedComputerGroupsModel, legend, dataLabel);

		},
		
		/**
		 * Navigates back to the master view upon request.
		 * Only on mobile platform.
		 */
		onNavBack: function() {
			sap.ui.core.UIComponent.getRouterFor(this).navTo("main");
		},
	
		/**
		 * All data is reloaded from the server in the current detail view.
		 */
		onRefresh: function() {
			const reload = true;
			this.getData(this.oGroup, reload);
		}
	
    });
});
