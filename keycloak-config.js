	let initOptions = {
		url: 'https://xx.xxx.com/auth',
        realm: 'xx',
        clientId: 'xx',
		onLoad: 'login-required'
	}

	let keycloak = Keycloak(initOptions);

	keycloak.init({ onLoad: initOptions.onLoad }).then((auth) => {
		if (!auth) {
			alert('not authenticated');
			window.location.reload();
			return;
		} 
		
		let errmsg = getQueryString('errmsg');
		if(errmsg){
			alert(getQueryString('errmsg'));
			return;
		}
		
		let step = getQueryString('step');
		if(!step){
			loginWithIdentityServer4(keycloak.token);
			return;
		}
		else{
			switch (step){
				case 'IdmLogin':
					idmLogin();
					break;
				case 'Completed':
					getIdmToken();
					loadProfile();
					break;	
				default:
					break;
			}	
		}

		//Token Refresh
		setInterval(() => {
			refreshToken(70);
		}, 1000*60)

	}).catch(() => {
		alert("Authenticated Failed, ailed to initialize");
	});
	
	function getQueryString(name) {
        var reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)', 'i');
        var r = window.location.search.substr(1).match(reg);
        if (r != null) {
            return unescape(r[2]);
        }
        return null;
	}


    function loadProfile() {
        keycloak.loadUserProfile().then(function(profile) {
            output(profile);
			console.log(keycloak);
        }).catch(function() {
            output('Failed to load profile');
        });
    }

    function updateProfile() {
        var url = keycloak.createAccountUrl().split('?')[0];
        var req = new XMLHttpRequest();
        req.open('POST', url, true);
        req.setRequestHeader('Accept', 'application/json');
        req.setRequestHeader('Content-Type', 'application/json');
        req.setRequestHeader('Authorization', 'bearer ' + keycloak.token);

        req.onreadystatechange = function () {
            if (req.readyState == 4) {
                if (req.status == 200) {
                    output('Success');
                } else {
                    output('Failed');
                }
            }
        }

        req.send('{"email":"myemail@foo.bar","firstName":"test","lastName":"bar"}');
    }

    function loadUserInfo() {
        keycloak.loadUserInfo().then(function(userInfo) {
            output(userInfo);
        }).catch(function() {
            output('Failed to load user info');
        });
    }

    function refreshToken(minValidity) {
        keycloak.updateToken(minValidity).then(function(refreshed) {
            if (refreshed) {
                output(keycloak.tokenParsed);
				renewIdmToken();
            } else {
                output('Token not refreshed, valid for ' + Math.round(keycloak.tokenParsed.exp + keycloak.timeSkew - new Date().getTime() / 1000) + ' seconds');
            }
        }).catch(function() {
            output('Failed to refresh token');
        });
    }

    function showExpires() {
        if (!keycloak.tokenParsed) {
            output("Not authenticated");
            return;
        }

        var o = 'Token Expires:\t\t' + new Date((keycloak.tokenParsed.exp + keycloak.timeSkew) * 1000).toLocaleString() + '\n';
        o += 'Token Expires in:\t' + Math.round(keycloak.tokenParsed.exp + keycloak.timeSkew - new Date().getTime() / 1000) + ' seconds\n';

        if (keycloak.refreshTokenParsed) {
            o += 'Refresh Token Expires:\t' + new Date((keycloak.refreshTokenParsed.exp + keycloak.timeSkew) * 1000).toLocaleString() + '\n';
            o += 'Refresh Expires in:\t' + Math.round(keycloak.refreshTokenParsed.exp + keycloak.timeSkew - new Date().getTime() / 1000) + ' seconds';
        }

        output(o);
    }

    function output(data) {
        if (typeof data === 'object') {
            data = JSON.stringify(data, null, '  ');
        }
        document.getElementById('output').innerHTML = data;
    }

    function event(event) {
        var e = document.getElementById('events').innerHTML;
        document.getElementById('events').innerHTML = new Date().toLocaleString() + "\t" + event + "\n" + e;
    }
	

    keycloak.onAuthSuccess = function () {
        event('Auth Success');
    };

    keycloak.onAuthError = function (errorData) {
        event("Auth Error: " + JSON.stringify(errorData) );
    };

    keycloak.onAuthRefreshSuccess = function () {
        event('Auth Refresh Success');
    };

    keycloak.onAuthRefreshError = function () {
        event('Auth Refresh Error');
    };

    keycloak.onAuthLogout = function () {
        event('Auth Logout');
    };

    keycloak.onTokenExpired = function () {
        event('Access token expired.');
    };

    keycloak.onActionUpdate = function (status) {
        switch (status) {
            case 'success':
                event('Action completed successfully'); break;
            case 'cancelled':
                event('Action cancelled by user'); break;
            case 'error':
                event('Action failed'); break;
        }
    };

