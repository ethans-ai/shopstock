import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneSlider,
  PropertyPaneTextField,
  PropertyPaneToggle
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import type { IReadonlyTheme } from '@microsoft/sp-component-base';
import { escape } from '@microsoft/sp-lodash-subset';

import styles from './ShopStockWebPart.module.scss';
import * as strings from 'ShopStockWebPartStrings';

export interface IShopStockWebPartProps {
  appUrl: string;
  startPath: string;
  height: number;
  linkOnly: boolean;
}

const MIN_HEIGHT: number = 300;
const MAX_HEIGHT: number = 1600;

export default class ShopStockWebPart extends BaseClientSideWebPart<IShopStockWebPartProps> {

  public render(): void {
    const appUrl: string = (this.properties.appUrl || '').trim();
    if (!appUrl) {
      this._renderNotice(strings.NotConfiguredTitle, strings.NotConfiguredBody, undefined);
      return;
    }

    const target: string | undefined = this._resolveTarget(appUrl, this.properties.startPath);
    if (!target) {
      this._renderNotice(strings.InvalidUrlTitle, strings.InvalidUrlBody, undefined);
      return;
    }

    // A frame the browser refuses to load renders as a blank rectangle with no
    // error, which reads as "the app is broken". Detect the one case we can see
    // from here — mixed content — and show the link instead.
    if (this._isMixedContentBlocked(target)) {
      this._renderNotice(strings.BlockedTitle, strings.BlockedBody, target);
      return;
    }

    if (this.properties.linkOnly) {
      this._renderNotice(strings.LinkOnlyTitle, '', target);
      return;
    }

    const height: number = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, this.properties.height || 800));
    const href: string = escape(target);

    // The frame is not sandboxed: ShopStock needs scripts, forms and its own
    // cookies to work at all, and every sandbox flag that would allow those
    // back is the whole of what sandboxing would have withheld.
    this.domElement.innerHTML = `
    <div class="${styles.shopStock}">
      <div class="${styles.toolbar}">
        <span class="${styles.address}">${href}</span>
        <a class="${styles.link}" href="${href}" target="_blank" rel="noreferrer">${escape(strings.OpenInNewTab)}</a>
      </div>
      <iframe class="${styles.frame}" src="${href}" height="${height}" title="ShopStock" loading="lazy"></iframe>
    </div>`;
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme || !currentTheme.semanticColors) {
      return;
    }

    this.domElement.style.setProperty('--bodyText', currentTheme.semanticColors.bodyText || null);
    this.domElement.style.setProperty('--link', currentTheme.semanticColors.link || null);
    this.domElement.style.setProperty('--linkHovered', currentTheme.semanticColors.linkHovered || null);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: [
            {
              groupName: strings.ConnectionGroupName,
              groupFields: [
                PropertyPaneTextField('appUrl', {
                  label: strings.AppUrlFieldLabel,
                  description: strings.AppUrlFieldDescription,
                  onGetErrorMessage: this._validateAppUrl.bind(this)
                }),
                PropertyPaneTextField('startPath', {
                  label: strings.StartPathFieldLabel,
                  description: strings.StartPathFieldDescription
                })
              ]
            },
            {
              groupName: strings.DisplayGroupName,
              groupFields: [
                PropertyPaneSlider('height', {
                  label: strings.HeightFieldLabel,
                  min: MIN_HEIGHT,
                  max: MAX_HEIGHT,
                  step: 20
                }),
                PropertyPaneToggle('linkOnly', {
                  label: strings.LinkOnlyFieldLabel
                })
              ]
            }
          ]
        }
      ]
    };
  }

  private _validateAppUrl(value: string): string {
    const trimmed: string = (value || '').trim();
    if (!trimmed) {
      return '';
    }
    return this._resolveTarget(trimmed, this.properties.startPath) ? '' : strings.InvalidUrlError;
  }

  private _resolveTarget(appUrl: string, startPath: string): string | undefined {
    try {
      const base: URL = new URL(appUrl);
      if (base.protocol !== 'http:' && base.protocol !== 'https:') {
        return undefined;
      }
      return new URL((startPath || '/').trim() || '/', base).href;
    } catch {
      return undefined;
    }
  }

  private _isMixedContentBlocked(target: string): boolean {
    if (window.location.protocol !== 'https:' || target.indexOf('http://') !== 0) {
      return false;
    }
    // Browsers treat loopback as a trustworthy origin, so an http://localhost
    // frame loads on an HTTPS page — which is exactly the single-station setup.
    const host: string = new URL(target).hostname;
    return host !== 'localhost' && host !== '127.0.0.1' && host !== '[::1]';
  }

  private _renderNotice(title: string, body: string, target: string | undefined): void {
    const link: string = target
      ? `<p><a class="${styles.link}" href="${escape(target)}" target="_blank" rel="noreferrer">${escape(target)}</a></p>`
      : '';

    this.domElement.innerHTML = `
    <div class="${styles.shopStock}">
      <div class="${styles.notice}">
        <h3>${escape(title)}</h3>
        ${body ? `<p>${escape(body)}</p>` : ''}
        ${link}
      </div>
    </div>`;
  }
}
