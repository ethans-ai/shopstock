declare interface IShopStockWebPartStrings {
  PropertyPaneDescription: string;
  ConnectionGroupName: string;
  DisplayGroupName: string;
  AppUrlFieldLabel: string;
  AppUrlFieldDescription: string;
  StartPathFieldLabel: string;
  StartPathFieldDescription: string;
  HeightFieldLabel: string;
  LinkOnlyFieldLabel: string;
  InvalidUrlError: string;
  NotConfiguredTitle: string;
  NotConfiguredBody: string;
  InvalidUrlTitle: string;
  InvalidUrlBody: string;
  BlockedTitle: string;
  BlockedBody: string;
  LinkOnlyTitle: string;
  OpenInNewTab: string;
}

declare module 'ShopStockWebPartStrings' {
  const strings: IShopStockWebPartStrings;
  export = strings;
}
