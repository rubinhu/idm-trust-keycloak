
	let initIdmOptions = {
		authority: "https://xx.xxx.com/auth",
		client_id: "peoplex", 
		redirect_uri: "https://xx.xxx.com/keycloak/idm-callback.html",
		response_type: "id_token token",
		scope: "openid profile api1",
		post_logout_redirect_uri: "https://xx.xxx.com/keycloak/index2.html",

		// silent renew will get a new access_token via an iframe 
		// just prior to the old access_token expiring (60 seconds prior)
		silent_redirect_uri: "https://xx.xxx.com/keycloak/idm-silent.html",
		automaticSilentRenew: true,
	 }
  
	var oidcMgr = new Oidc.UserManager(initIdmOptions);
	
	
	function loginWithIdentityServer4(token)
	{
		var url = initIdmOptions.authority + '/Account/LoginWithKeycloak?returnUrl={0}&keyCloakToken={1}';
		url = url.replace('{0}',window.location.href).replace('{1}',token);
		window.location.replace(url);
	}
	
	function idmLogin() {
		oidcMgr.signinRedirect();
	}
	
	function idmLogout() {
		oidcMgr.signoutRedirect();
	}
	
	function idmRedirectCallback()
	{
		new Oidc.UserManager().signinRedirectCallback().then(function (user) {
			console.log(user);
			window.history.replaceState({},
				window.document.title,
				window.location.origin + window.location.pathname);
			window.location = "index2.html?step=Completed";
		});
	}
	
	function IdmSilentCallback()
	{
		oidcMgr.signinSilentCallback();
	}
	
	function getIdmToken() {
		oidcMgr.getUser().then(function (user) {
			if (user) {
				console.log(user);
				outputIdm(user);
			} else {
				console.log("Not logged in");
				outputIdm("Not logged in");
			}
		});
	}

	function renewIdmToken() {
	  oidcMgr.signinSilent()
		.then(function () {
		  console.log("silent renew success");
		}).catch(function (err) {
		  console.log("silent renew error", err);
		});
	}
	
	function outputIdm(data) {
        if (typeof data === 'object') {
            data = JSON.stringify(data, null, '  ');
        }
        document.getElementById('outputidm').innerHTML = data;
    }

    function eventIdm(event) {
        var e = document.getElementById('eventsidm').innerHTML;
        document.getElementById('eventsidm').innerHTML = new Date().toLocaleString() + "\t" + event + "\n" + e;
    }

	oidcMgr.events.addUserLoaded(function (user) {
	  //console.log("User loaded");
	  eventIdm("User loaded");
	  getIdmToken();
	});
	oidcMgr.events.addUserUnloaded(function () {
	  //console.log("User logged out locally");
	  eventIdm("User logged out locally");
	  getIdmToken();
	});
	oidcMgr.events.addAccessTokenExpiring(function () {
	  //console.log("Access token expiring..." + new Date());
	  eventIdm("Access token expiring...");
	});
	oidcMgr.events.addSilentRenewError(function (err) {
	  //console.log("Silent renew error: " + err.message);
	  eventIdm("Silent renew error: " + err.message);
	});
	oidcMgr.events.addUserSignedOut(function () {
	  //console.log("User signed out of OP");
	  eventIdm("User signed out of OP");
	  oidcMgr.removeUser();
	});