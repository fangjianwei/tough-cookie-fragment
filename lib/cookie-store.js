'use strict';
var tough = require('tough-cookie');
var Store = tough.Store;
var permuteDomain = tough.permuteDomain;
var permutePath = tough.permutePath;
var util = require('util');
var cacheStore = global.cacheManager;
var Promise     = require("bluebird");


function CookieStoreFramework(keySign,cookieStore) {
    Store.call(this);
    this.idx = {}; // idx is memory cache

    this.cookieStore = cookieStore;

    var self = this;
    this.keySign = keySign;
    loadFromStore(this.keySign, function(dataJson) {
        if(dataJson)
            self.idx = dataJson;
    });
}

util.inherits(CookieStoreFramework, Store);
exports.CookieStoreFramework = CookieStoreFramework;
CookieStoreFramework.prototype.idx = null;
CookieStoreFramework.prototype.synchronous = true;

// force a default depth:
CookieStoreFramework.prototype.inspect = function() {
    return "{ idx: "+util.inspect(this.idx, false, 2)+' }';
};

CookieStoreFramework.prototype.findCookie = function(domain, path, key, cb) {
    if (!this.idx[domain]) {
        return cb(null,undefined);
    }
    if (!this.idx[domain][path]) {
        return cb(null,undefined);
    }
    return cb(null,this.idx[domain][path][key]||null);
};

CookieStoreFramework.prototype.findCookies = function(domain, path, cb) {
    var results = [];
    if (!domain) {
        return cb(null,[]);
    }

    var pathMatcher;
    if (!path) {
        // null or '/' means "all paths"
        pathMatcher = function matchAll(domainIndex) {
            for (var curPath in domainIndex) {
                var pathIndex = domainIndex[curPath];
                for (var key in pathIndex) {
                    results.push(pathIndex[key]);
                }
            }
        };

    } else if (path === '/') {
        pathMatcher = function matchSlash(domainIndex) {
            var pathIndex = domainIndex['/'];
            if (!pathIndex) {
                return;
            }
            for (var key in pathIndex) {
                results.push(pathIndex[key]);
            }
        };

    } else {
        var paths = permutePath(path) || [path];
        pathMatcher = function matchRFC(domainIndex) {
            paths.forEach(function(curPath) {
                var pathIndex = domainIndex[curPath];
                if (!pathIndex) {
                    return;
                }
                for (var key in pathIndex) {
                    results.push(pathIndex[key]);
                }
            });
        };
    }

    var domains = permuteDomain(domain) || [domain];
    var idx = this.idx;
    domains.forEach(function(curDomain) {
        var domainIndex = idx[curDomain];
        if (!domainIndex) {
            return;
        }
        pathMatcher(domainIndex);
    });

    cb(null,results);
};

CookieStoreFramework.prototype.putCookie = function(cookie, cb) {
    if (!this.idx[cookie.domain]) {
        this.idx[cookie.domain] = {};
    }
    if (!this.idx[cookie.domain][cookie.path]) {
        this.idx[cookie.domain][cookie.path] = {};
    }
    this.idx[cookie.domain][cookie.path][cookie.key] = cookie;
    saveToStore(this.keySign, this.idx, function() {
        cb(null);
    });
};

CookieStoreFramework.prototype.updateCookie = function updateCookie(oldCookie, newCookie, cb) {
    // updateCookie() may avoid updating cookies that are identical.  For example,
    // lastAccessed may not be important to some stores and an equality
    // comparison could exclude that field.
    this.putCookie(newCookie,cb);
};

CookieStoreFramework.prototype.removeCookie = function removeCookie(domain, path, key, cb) {
    if (this.idx[domain] && this.idx[domain][path] && this.idx[domain][path][key]) {
        delete this.idx[domain][path][key];
    }
    saveToStore(this.keySign, this.idx, function() {
        cb(null);
    });
};

CookieStoreFramework.prototype.removeCookies = function removeCookies(domain, path, cb) {
    if (this.idx[domain]) {
        if (path) {
            delete this.idx[domain][path];
        } else {
            delete this.idx[domain];
        }
    }
    saveToStore(this.keySign, this.idx, function() {
        return cb(null);
    });
};

function saveToStore(keySign, data, cb) {
    var self = this;
	console.log('====start to sotre the data to redis====,key=' + keySign + ',data====>' + data );
    var dataJson = JSON.stringify(data);
    var dd = new Promise(function(resolve,reject){
    	self.cookieStore.put(keySign,dataJson);
    	resolve();
    });

    dd.then(function(){
    	console.log('==redis store success=='+data);
    	cb();
    }).catch(function(err){
    	throw err;
    });

}

function loadFromStore(keySign, cb) {
	console.log('===start to load cookie from reids,key='+keySign);
    this.cookieStore.get(keySign,function(data){
	    var dataJson = data ? JSON.parse(data) : null;
	    console.log('====redis===,key='+keySign+',data=====>'+dataJson);
	    for(var domainName in dataJson) {
	        for(var pathName in dataJson[domainName]) {
	            for(var cookieName in dataJson[domainName][pathName]) {
	                dataJson[domainName][pathName][cookieName] = tough.fromJSON(JSON.stringify(dataJson[domainName][pathName][cookieName]));
	            }
	        }
	    }
	    cb(dataJson);
    });

}
