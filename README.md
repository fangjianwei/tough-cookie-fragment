# A framework of Cookie Store

tough-cookie-framework is a File store for tough-cookie module. See 
[tough-cookie documentation](https://github.com/goinstant/tough-cookie#constructionstore--new-memorycookiestore-rejectpublicsuffixes) for more info.


## installation

    $ npm install tough-cookie-framework

## Options

  `keySign` key sign of cookiejar.
  `store enginer`

## Usage

``` javascript
  var CookieStoreFramework = require("tough-cookie-framework");
  var CookieJar = require("tough-cookie").CookieJar;
  var storeEngine = new StoreEngine(); //your store engine impl

  var jar = new CookieJar(new FileCookieStore("xhwyw000",sotreEngine));
```
## License

 MIT
