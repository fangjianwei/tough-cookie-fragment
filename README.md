# A framework of Cookie Store

tough-cookie-framework is a framework of tough-cookie module. See 
[tough-cookie documentation](https://github.com/goinstant/tough-cookie#constructionstore--new-memorycookiestore-rejectpublicsuffixes) for more info.


## installation

    $ npm install tough-cookie-framework

## Options

  `options` : a javascript object.\<br>
   ``` javascript
   {
      key:string,
      get:function(key,callback){},
      put:function(key,data){} 
   }
   ```

## Usage

``` javascript
  var CookieStoreFramework = require("tough-cookie-framework");
  var CookieJar = require("tough-cookie").CookieJar;
  var storeEngine = new StoreEngine(); //your store engine impl

  var jar = new CookieJar(new CookieStoreFramework({
      key:'abcd',
      get:function(key,callback){
          storeEngine.get(key,callback);
      },
      put:function(key,value,callback){
          storeEngine.put(key,value,callback);
      }
  });
  
```
## License

 MIT
