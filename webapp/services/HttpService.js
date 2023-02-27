sap.ui.define([
	"sap/ui/base/Object",
	"com/sap/report/services/AuthService",
], function (BaseObject, AuthService) {

	/**
	 * This class serves as a http service that can be used by controls
	 * to make http requests to the Jamf API.
	 * 
	 * It handles getting a bearer token for the new kind of authentication needed
	 * to access the Jamf API.
	 * When a control would like to make a request, a token is automatically requested,
	 * if there was no token requested before or the one that has been used expired.
	 * Then it is attached to the request header "Authorization" for every request.
	 * 
	 * This class is implemented as a singleton to ensure, that there is only one
	 * instance of it. There is no need to have more than one valid access token at a time.
	 *
	 */
	var instance;
	var HttpService = BaseObject.extend("com.sap.report.HttpService", {
		baseURL: 'http://localhost:8000/',
		authService: null,

		constructor: function () {
			this.authService = AuthService.getInstance();
		},


		/**
		 * This method takes care of making the http request.
		 * Checks token validity, takes care of requesting a new one if needed.
		 * Returns the response data or throws an error, if there was a problem.
		 * @param {string} url the url that the request is to be made to.
		 * @param {string} type the http request type. GET, POST etc.
		 * @param {object} headers the headers of the http request.
		 *					An "Authorization" header will be appended to these.
		 * @public
		 */
		makeRequest: async function (url, type, headers) {
			url = this.baseURL + url;
			headers = await this.authService.appendAuthenticationHeader(headers).catch((error) => { throw new Error(error); });
			const data = await $.ajax({ url, headers, type })
				.catch((error) => { throw new Error(error); });

			return data;
		}

	});

	/**
	 * Since the class is a singleton only create a new instance
	 * if there is no instance yet. Otherwise just return the existing instance.
	 */
	return {
		getInstance: function () {
			if (!instance) {
				instance = new HttpService();
			}
			return instance;
		}
	};
});