// reworked from https://github.com/msealand/z85.node/blob/master/index.js

// Implements http://rfc.zeromq.org/spec:32
// Ported from https://github.com/zeromq/libzmq/blob/8cda54c52b08005b71f828243f22051cdbc482b4/src/zmq_utils.cpp#L77-L168

const encoder =
  // replace <> by ; and '
  // bruh we need other symbols instead of "
  // % by ,
  // } by `
  // ) by _

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI
  /*
A–Z a–z 0–9 - _ . ! ~ * ' ( )
; / ? : @ & = + $ , #
  */
  // `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&';(_[]{\`@,$#`
  // "^[]{`"
  // 0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_.!~*%27();/?:@&=+$,#%5E[]%7B%60
  `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_.!~*'();/?:@&=+$,#^[]`
    //
    .split("");
// "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#".split("");

//`!@#$%^&*()_+-=[{}]';:"/?.><,

// @note 32-128 ascii table
const decoder = new Uint8Array(128 - 32);
encoder.forEach((c, n) => (decoder[c.charCodeAt(0) - 32] = n));

const Q85 = 85 * 85 * 85 * 85;
const T256 = 256 * 256 * 256;

export const encode85 = (data: Uint8Array) => {
  if (data.length % 4 != 0) {
    throw "[b85] Input length must be mod4";
  }

  let str = "",
    byte_nbr = 0,
    size = data.length,
    value = 0;

  while (byte_nbr < size) {
    var characterCode = data[byte_nbr++];
    // @note ... << left shift works on signed 32 ints so shifting 255 by 24 will cause negative number...
    value = value * 256 + characterCode;
    if (byte_nbr % 4 == 0) {
      var divisor = Q85;
      while (divisor >= 1) {
        var idx = Math.floor(value / divisor) % 85;
        str += encoder[idx];
        divisor /= 85;
      }
      value = 0;
    }
  }

  return str;
};

export const decode85 = (string: string) => {
  if (string.length % 5 != 0) {
    throw "x85 input length is not mod5";
  }

  let dest = new Uint8Array((string.length * 4) / 5),
    byte_nbr = 0,
    char_nbr = 0,
    string_len = string.length,
    value = 0;

  while (char_nbr < string_len) {
    var idx = string.charCodeAt(char_nbr++) - 32;
    if (idx < 0 || idx >= decoder.length) {
      throw "x85 invalid characters";
    }
    value = value * 85 + decoder[idx];
    if (char_nbr % 5 == 0) {
      var divisor = T256;
      while (divisor >= 1) {
        dest[byte_nbr++] = (value / divisor) % 256;
        // @note don't use shift here as well bruh
        divisor /= 256;
      }
      value = 0;
    }
  }

  return dest;
};
