/**
 * Platform Router — يوجّه كل منصة لـ parser المناسب
 * المحور الأساسي لدعم الحصاد من 15+ منصة
 */

import {
  parseDubizzleList,
  parseDubizzleDetail,
  type ListPageListing,
  type ListingDetails,
} from "./dubizzle";
import { parseOpenSooqList, parseOpenSooqDetail, getOpenSooqListPageUrl } from "./opensooq";
import { parseHatla2eeList, parseHatla2eeDetail, getHatla2eeListPageUrl } from "./hatla2ee";
import { parseAqarmapList, parseAqarmapDetail, getAqarmapListPageUrl } from "./aqarmap";
import { parseContactCarsList, parseContactCarsDetail, getContactCarsListPageUrl } from "./contactcars";
import { parseCarSemsarList, parseCarSemsarDetail, getCarSemsarListPageUrl } from "./carsemsar";
import { parsePropertyFinderList, parsePropertyFinderDetail, getPropertyFinderListPageUrl } from "./propertyfinder";
import { parseYallamotorList, parseYallamotorDetail, getYallamotorListPageUrl } from "./yallamotor";
import { parseGenericList, parseGenericDetail } from "./generic";

export interface PlatformParser {
  parseList: (html: string) => ListPageListing[];
  parseDetail: (html: string) => ListingDetails;
  getListPageUrl?: (baseUrl: string, category: string, governorate: string, page: number) => string;
}

const parsers: Record<string, PlatformParser> = {
  dubizzle: {
    parseList: parseDubizzleList,
    parseDetail: parseDubizzleDetail,
  },
  opensooq: {
    parseList: parseOpenSooqList,
    parseDetail: parseOpenSooqDetail,
    getListPageUrl: getOpenSooqListPageUrl,
  },
  hatla2ee: {
    parseList: parseHatla2eeList,
    parseDetail: parseHatla2eeDetail,
    getListPageUrl: getHatla2eeListPageUrl,
  },
  aqarmap: {
    parseList: parseAqarmapList,
    parseDetail: parseAqarmapDetail,
    getListPageUrl: getAqarmapListPageUrl,
  },
  contactcars: {
    parseList: parseContactCarsList,
    parseDetail: parseContactCarsDetail,
    getListPageUrl: getContactCarsListPageUrl,
  },
  carsemsar: {
    parseList: parseCarSemsarList,
    parseDetail: parseCarSemsarDetail,
    getListPageUrl: getCarSemsarListPageUrl,
  },
  propertyfinder: {
    parseList: parsePropertyFinderList,
    parseDetail: parsePropertyFinderDetail,
    getListPageUrl: getPropertyFinderListPageUrl,
  },
  yallamotor: {
    parseList: parseYallamotorList,
    parseDetail: parseYallamotorDetail,
    getListPageUrl: getYallamotorListPageUrl,
  },
};

/**
 * Get the parser for a specific platform
 * Falls back to generic parser if platform not found
 */
export function getParser(platform: string): PlatformParser {
  return parsers[platform] || {
    parseList: parseGenericList,
    parseDetail: parseGenericDetail,
  };
}

/**
 * Get all registered platform IDs
 */
export function getRegisteredPlatforms(): string[] {
  return Object.keys(parsers);
}

/**
 * Check if a platform has a registered parser
 */
export function hasPlatformParser(platform: string): boolean {
  return platform in parsers;
}
