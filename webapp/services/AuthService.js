sap.ui.define(["sap/ui/base/Object"], function (BaseObject) {

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
    var AuthService = BaseObject.extend("com.sap.report.AuthService", {
        tokenEndPoint: 'http://localhost:8000/api/v1/auth/token',
        credentials: {
            username: 'testUser',
            password: 'password'
        },
        tokenPromise: null,
        tokenExpiry: null,
        bearerToken: null,

        constructor: function () { },

        /**
         * This method requests a bearer token from the Jamf API.
         * And sets the two class fields containing the token
         * and its expiry.
.	       * @private
         */
        _getBearerToken: async function () {
            const username = this.credentials.username;
            const password = this.credentials.password;
            if (!this.tokenPromise) {
                this.tokenPromise = $.ajax({
                    url: this.tokenEndPoint,
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Authorization": "Basic " + btoa(username + ':' + password)
                    },
                    error: (error) => { throw new Error(error) },
                    type: 'POST'
                });
            }

            const authData = await this.tokenPromise;
            this.tokenExpiry = new Date(authData.expires);
            this.bearerToken = authData.token;
            this.tokenPromise = null;
        },

        /**
         * This method appends the bearer token to the "Authorization" header.
         * @param {object} headers The object containing all the headers
         *							request to be made.
         * @experimental Since 1.24 Behavior might change.
         * @private
         */
        appendAuthenticationHeader: async function (headers) {
            const tokenValid = await this._checkTokenValidity().catch((error) => { throw new Error(error); });
            if (!tokenValid) await this._getBearerToken().catch((error) => { throw new Error(error); });
            headers["Authorization"] = `Bearer ${this.bearerToken}`;
            return headers;
        },

        /**
         * This method checks the validity of the bearer token.
         * If it is expired or there hasn't been one requested
         * the token is not valid.
         * @private
         */
        _checkTokenValidity: async function () {
            if (!this.bearerToken || Date.now() >= this.tokenExpiry) {
                return false;
            }

            return true;
        }

    });

    /**
     * Since the class is a singleton only create a new instance
     * if there is no instance yet. Otherwise just return the existing instance.
     */
    return {
        getInstance: function () {
            if (!instance) {
                instance = new AuthService();
            }
            return instance;
        }
    };
});