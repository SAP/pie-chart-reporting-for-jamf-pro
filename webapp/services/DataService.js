sap.ui.define([
	"sap/ui/base/Object",
	"com/sap/report/services/HttpService"
], function (BaseObject, HttpService) {

	/**
	 * This class is used as a data service, handling all data related actions.
	 * If a controller needs some data, it can use this service to get it.
	 * It takes care of making the required http requests to get the required data.
	 * Then stores it for any subsequent data requests from the controllers.
	 * There is also an option to reload the data and not use the cached data if needed.
	 * 
	 * This class is implemented as a singleton to ensure, that there is only one
	 * instance of it.
	 *
	 */
	var instance;
	var DataService = BaseObject.extend("com.sap.report.DataService", {

		httpService: null,
		computerGroups: null,
		detailedComputerGroups: {},
		numberOfComputers: null,

		/**
		 * The contsructor of the class.
		 * It needs an instance of the http service to be able to
		 * make requests to get the requested data.
		 */
		constructor: function () {
			this.httpService = HttpService.getInstance();
		},

		/**
		 * This function gets all computer groups,
		 * with the help of the httpService.
		 * @param {boolean} reload if true, a new request is made and the data is reloaded from the server.
		 */
		getComputerGroups: async function (reload) {
			if (reload || !this.computerGroups) {
				const requestUrl = "JSSResource/computergroups?$format=json";
				const requestType = 'GET';
				const requestHeaders = {
					"Accept": "application/json",
					"Content-Type": "application/json"
				}
				this.computerGroups = this.httpService
					.makeRequest(requestUrl, requestType, requestHeaders)
					.catch((error) => { throw new Error(error); });
			}

			this.computerGroups = await this.computerGroups;

			this.computerGroups = this.parseIfJSON(this.computerGroups);

			// filter computerGroups
			const reportComputerGroups = this.filterComputerGroupsByName(this.computerGroups.computer_groups, "REPORT", 0);

			// begin loading all detail view data in the background
			this.backgroundLoadAllDetails(reportComputerGroups);

			return reportComputerGroups;
		},

		/**
		 * Parses the argument if it is in json format, otherwise returns the argument.
		 * @param {string/array/object} toBeParsed The argument to be parsed, if it's a string.
		 */
		parseIfJSON: function (toBeParsed) {
			if (typeof toBeParsed === "string") {
				toBeParsed = JSON.parse(toBeParsed);
			}

			return toBeParsed;
		},

		/**
		 * This function is used to preload all data that will be needed
		 * in the background. This makes switching between the detail
		 * views much faster in comparison to loading the data needed
		 * for a detail view on demand.
		 * @param {computerGroups} the array of computer groups for which the detail data is needed in the app
		 */
		backgroundLoadAllDetails: function (computerGroups) {

			for (const computerGroup of computerGroups) {
				this.getOneComputerGroupDetail(computerGroup.id);
			}

		},


		/**
		 * This function filters a list of computer groups by name.
		 * If a computer groups name contains a specific substring,
		 * then it is added to the result array.
		 * The computer groups names that this function filters include '|'s for better structure.
		 * The names first are divided at the '|'s. Then the filter is applied to a specific position in the split name
		 * @param {array} aComputerGroups the original array of computer groups to be filtered.
		 * @param {string} sSubstring the substring to which to filter to.
		 * @param {number} nIndex the index on which position the filter should be applied to.
		 */
		filterComputerGroupsByName: function (aComputerGroups, sSubstring, nIndex) {
			var aFilteredComputerGroups = [];
			for (const computerGroup of aComputerGroups) {
				const aSplitName = computerGroup.name.split("|");
				if (aSplitName[nIndex] === sSubstring) {
					computerGroup.displayName = aSplitName[1];
					computerGroup.subTitle = aSplitName.length > 3 ? aSplitName[2] : "";
					aFilteredComputerGroups.push(computerGroup);
				}
			}
			return aFilteredComputerGroups;
		},

		/**
		 * This function requests one computer group's details from the server.
		 * @param {number} groupId The id of the group to be loaded.
		 * @param {boolean} reload If true, the group detail data is requested again.
		 */
		getOneComputerGroupDetail: async function (groupId, reload) {
			if (reload || !this.detailedComputerGroups[groupId]) {
				const requestUrl = "JSSResource/computergroups/id/" + groupId;
				const requestType = 'GET';
				const requestHeaders = {
					"Accept": "application/json",
					"Content-Type": "application/json"
				};
				this.detailedComputerGroups[groupId] = this.httpService
					.makeRequest(requestUrl, requestType, requestHeaders)
					.catch((error) => { throw new Error(error); });
			}

			this.detailedComputerGroups[groupId] = await this.detailedComputerGroups[groupId];
			this.detailedComputerGroups[groupId] = this.parseIfJSON(this.detailedComputerGroups[groupId]);
			let computerGroup = this.detailedComputerGroups[groupId].computer_group;
			return computerGroup;
		},

		/**
		 * This function gets the number of currently managed computers.
		 * @param {boolean} reload If true, the data is requested again from the server.
		 */
		getNumberOfManagedComputers: async function (reload) {
			if (!reload) {
				if (this.numberOfComputers) {
					return this.numberOfComputers;
				}
			}
			const requestUrl = "api/v1/inventory-information";
			const requestType = 'GET';
			const requestHeaders = {
				"Accept": "application/json",
				"Content-Type": "application/json"
			}

			this.numberOfComputers = await this.httpService
				.makeRequest(requestUrl, requestType, requestHeaders)
				.catch((error) => { throw new Error(error); });

			this.numberOfComputers = JSON.parse(this.numberOfComputers);

			this.numberOfComputers = this.numberOfComputers.managedComputers + this.numberOfComputers.unmanagedComputers;

			return this.numberOfComputers;
		}

	});

	/**
	 * Since the class is a singleton only create a new instance
	 * if there is no instance yet. Otherwise just return the existing instance.
	 */
	return {
		getInstance: function () {
			if (!instance) {
				instance = new DataService();
			}
			return instance;
		}
	};
});