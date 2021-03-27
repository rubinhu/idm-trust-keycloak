// Copyright (c) Brock Allen & Dominick Baier. All rights reserved.
// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.


using IdentityModel;
using IdentityServer4;
using IdentityServer4.Events;
using IdentityServer4.Extensions;
using IdentityServer4.Models;
using IdentityServer4.Services;
using IdentityServer4.Stores;
using IdentityServer4.EntityFramework.Interfaces;
//using IdentityServer4.Test;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Linq;
using System.Threading.Tasks;
using IdentityServerHost.Quickstart.Account;
using System.Text.RegularExpressions;
using IdentityServer4.EntityFramework.DbContexts;
using Microsoft.Extensions.Localization;
using Serilog;
using IdentityServerHost.Quickstart.WeChat;
using IdentityServerHost.Quickstart.UI;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json;
using System.Net.Http;
using System.Net.Http.Headers;

namespace IdentityServerHost.Quickstart.UI
{
    /// <summary>
    /// This sample controller implements a typical login/logout/provision workflow for local and external accounts.
    /// The login service encapsulates the interactions with the user data store. This data store is in-memory only and cannot be used for production!
    /// The interaction service provides a way for the UI to communicate with identityserver for validation and context retrieval
    /// </summary>
    [SecurityHeaders]
    [AllowAnonymous]
    public class AccountController : Controller
    {
        //private readonly TestUserStore _users;
        private readonly IIdentityServerInteractionService _interaction;
        private readonly IClientStore _clientStore;
        private readonly IAuthenticationSchemeProvider _schemeProvider;
        private readonly IEventService _events;
        private readonly IAuthRepository _users;
        private readonly AccountService _account;
		
		private readonly WeChatService _wechatService;

        private readonly IStringLocalizer<AccountController> _localizer;
        private readonly IHttpClientFactory _httpClientFactory;

        public AccountController(IStringLocalizer<AccountController> localizer,
            IIdentityServerInteractionService interaction,
            IClientStore clientStore,
            IAuthenticationSchemeProvider schemeProvider,
            IEventService events, ConfigurationDbContext configurationDbContext,
            IHttpClientFactory httpClientFactory,
            IAuthRepository users = null)
        {
            // if the TestUserStore is not in DI, then we'll just use the global users collection
            // this is where you would plug in your own custom identity management library (e.g. ASP.NET Identity)
			_users = users;

            _interaction = interaction;
            _clientStore = clientStore;
            _schemeProvider = schemeProvider;
            _events = events;
			
			_wechatService = new WeChatService(configurationDbContext);

            _account = new AccountService(configurationDbContext);
            _localizer = localizer;

            _httpClientFactory = httpClientFactory;
        }

        /// <summary>
        /// Login with Keycloak
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> LoginWithKeycloak(string returnUrl, string keyCloakToken)
        {
            if (string.IsNullOrEmpty(returnUrl))
            {
                return Redirect("~/");
            }

            if (string.IsNullOrEmpty(keyCloakToken))
            {
                returnUrl = returnUrl + (returnUrl.IndexOf('?') > 0 ? "&" : "?") + "errmsg=No Keycloak token";
                return Redirect(returnUrl);
            }
            bool logged = false;
            string errmsg = string.Empty;
            try
            {
                var jsonPayload = Base64UrlEncoder.Decode(keyCloakToken.Split('.')[1]);
                JObject claims = (JObject)JsonConvert.DeserializeObject(jsonPayload);
                string keyCloakUrl = claims["iss"].ToString() + "/account";

                //从工厂获取请求对象
                var client = _httpClientFactory.CreateClient("configured-inner-handler");
                var request = new HttpRequestMessage()
                {
                    Method = HttpMethod.Get,
                    RequestUri = new Uri(keyCloakUrl),
                    Content = new StringContent(string.Empty)
                };
                request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", keyCloakToken);
                var response = await client.SendAsync(request);

                if (response.IsSuccessStatusCode)
                {
                    var responseContent = response.Content.ReadAsStringAsync().Result;
                    JObject user = (JObject)JsonConvert.DeserializeObject(responseContent);

                    /*{ "username": "", "firstName": "",  "lastName": "", "email": "", "emailVerified": false, "attributes": { "LDAP_ENTRY_DN": ["" ], "modifyTimestamp": [""], "createTimestamp": [""], "LDAP_ID": [""] }}*/
                    AuthenticationProperties props = null;
                    // issue authentication cookie with subject ID and username
                    var isuser = new IdentityServerUser(user["username"].ToString().ToUpper())
                    {
                        DisplayName = user["firstName"].ToString()
                    };
                    await HttpContext.SignInAsync(isuser, props);
                    logged = true;
                }
                else
                {
                    errmsg = "HTTP 401 Unauthorized";
                }
            }
            catch (Exception ex)
            {
                errmsg = ex.Message;
            }

            returnUrl = returnUrl + (returnUrl.IndexOf('?') > 0 ? "&" : "?") + ("step=IdmLogin") + (logged ? "" : ("&errmsg=" + errmsg));
            return Redirect(returnUrl);
        }
    }
}