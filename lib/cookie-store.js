'use strict';
var tough = require('tough-cookie');
var Store = tough.Store;
var permuteDomain = tough.permuteDomain;
var permutePath = tough.permutePath;
var util = require('util');
var cookieStore = {};

/**
 *  
 *  @param options 
 *  {
 *      key:string,
 *      get:function(key,callback){},
 *      put:function(key,data){} 
 *  }
 *
*/
function CookieStoreFramework(options) {
    Store.call(this);
    this.idx = {}; // idx is memory cache

    cookieStore = createSotreEngine(options);
    var self = this;
    this.keySign = options.key;
    loadFromStore(this.keySign, function(dataJson) {
        if(dataJson)
            self.idx = dataJson;
    });
}

/**
 * create a wrapper sotre engine
 * @param options {get:funtion(keySign,callback){},put:function(keySign,data){}}
**/
function createSotreEngine(options){
    var engine = function(){
    };

    engine.prototype.put=function(keySign,data,callback){};
    engine.prototype.get=function(keySign,callback){};

    if(options&&typeof options.get==='function'){
        engine.get = options.get;
    }

    if(options&&typeof options.put==='function'){
        engine.put = options.put;
    }
    return engine;
}

util.inherits(CookieStoreFramework, Store);
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
    //console.log('====start to sotre the data to redis====,key=' + keySign + ',data====>' + data );
    var dataJson = new Buffer(JSON.stringify(data));
    //console.log(dataJson);
    cookieStore.put(keySign,dataJson.toString('base64'),function(err,reply){
        if( !err ){
            //console.log('=======cookie store success==');
            cb();
        }
    });
}

function loadFromStore(keySign, cb) {
    //console.log('===start to load cookie from reids,key='+keySign);
    cookieStore.get(keySign,function(error,data){
        if(error){
            //console.log('=====redis load error'+error);
            return;
        }

        if( !data ){
            return;
        }
        var dataStr = new Buffer(data, 'base64');
        var dataJson = data ? JSON.parse(dataStr.toString()) : null;
        //console.log('====redis===,key='+keySign+',data=====>'+dataJson);
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

exports.CookieStoreFramework = CookieStoreFramework;