/**
 * Curated list of world currencies.
 * Each entry: { code: ISO-4217, name: display name, symbol: currency symbol }
 *
 * The `symbol` is what gets stored in Tenant.currencySymbol and used throughout
 * the app for price display. The `code` and `name` are used only in the
 * Settings dropdown for a better user experience.
 */
export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar',           symbol: '$'   },
  { code: 'EUR', name: 'Euro',                symbol: '€'   },
  { code: 'GBP', name: 'British Pound',       symbol: '£'   },
  { code: 'GHS', name: 'Ghanaian Cedi',       symbol: 'GH₵' },
  { code: 'NGN', name: 'Nigerian Naira',      symbol: '₦'   },
  { code: 'KES', name: 'Kenyan Shilling',     symbol: 'KSh' },
  { code: 'ZAR', name: 'South African Rand',  symbol: 'R'   },
  { code: 'UGX', name: 'Ugandan Shilling',    symbol: 'USh' },
  { code: 'TZS', name: 'Tanzanian Shilling',  symbol: 'TSh' },
  { code: 'ETB', name: 'Ethiopian Birr',      symbol: 'Br'  },
  { code: 'EGP', name: 'Egyptian Pound',      symbol: 'E£'  },
  { code: 'MAD', name: 'Moroccan Dirham',     symbol: 'د.م.'},
  { code: 'CAD', name: 'Canadian Dollar',     symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar',   symbol: 'A$'  },
  { code: 'NZD', name: 'New Zealand Dollar',  symbol: 'NZ$' },
  { code: 'CHF', name: 'Swiss Franc',         symbol: 'Fr'  },
  { code: 'SEK', name: 'Swedish Krona',       symbol: 'kr'  },
  { code: 'NOK', name: 'Norwegian Krone',     symbol: 'kr'  },
  { code: 'DKK', name: 'Danish Krone',        symbol: 'kr'  },
  { code: 'JPY', name: 'Japanese Yen',        symbol: '¥'   },
  { code: 'CNY', name: 'Chinese Yuan',        symbol: '¥'   },
  { code: 'HKD', name: 'Hong Kong Dollar',    symbol: 'HK$' },
  { code: 'SGD', name: 'Singapore Dollar',    symbol: 'S$'  },
  { code: 'INR', name: 'Indian Rupee',        symbol: '₹'   },
  { code: 'PKR', name: 'Pakistani Rupee',     symbol: '₨'   },
  { code: 'BDT', name: 'Bangladeshi Taka',    symbol: '৳'   },
  { code: 'MYR', name: 'Malaysian Ringgit',   symbol: 'RM'  },
  { code: 'THB', name: 'Thai Baht',           symbol: '฿'   },
  { code: 'PHP', name: 'Philippine Peso',     symbol: '₱'   },
  { code: 'IDR', name: 'Indonesian Rupiah',   symbol: 'Rp'  },
  { code: 'BRL', name: 'Brazilian Real',      symbol: 'R$'  },
  { code: 'MXN', name: 'Mexican Peso',        symbol: 'MX$' },
  { code: 'ARS', name: 'Argentine Peso',      symbol: '$'   },
  { code: 'COP', name: 'Colombian Peso',      symbol: '$'   },
  { code: 'AED', name: 'UAE Dirham',          symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal',         symbol: '﷼'   },
  { code: 'TRY', name: 'Turkish Lira',        symbol: '₺'   },
];

/**
 * Find a currency entry by its symbol.
 * Used to resolve the stored symbol back to a full currency entry in the dropdown.
 * Returns the first match (USD is preferred for bare `$`).
 */
export function getCurrencyBySymbol(symbol) {
  return CURRENCIES.find((c) => c.symbol === symbol) ?? CURRENCIES[0];
}

/**
 * Find a currency entry by its ISO code.
 */
export function getCurrencyByCode(code) {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export default CURRENCIES;
