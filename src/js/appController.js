/**
 * @license
 * Copyright (c) 2014, 2026, Oracle and/or its affiliates.
 * Licensed under The Universal Permissive License (UPL), Version 1.0
 * as shown at https://oss.oracle.com/licenses/upl/
 * @ignore
 */
/*
 * Your application specific code will go here
 */
define(['knockout', 'ojs/ojcontext', 'ojs/ojmodule-element-utils', 'ojs/ojresponsiveutils', 'ojs/ojresponsiveknockoututils', 'ojs/ojarraydataprovider', 'ojs/ojknockouttemplateutils', 'ojs/ojmodule-element', 'ojs/ojknockout'],
  function(ko, Context, moduleUtils, ResponsiveUtils, ResponsiveKnockoutUtils, ArrayDataProvider, KnockoutTemplateUtils) {

     function ControllerViewModel() {

        this.KnockoutTemplateUtils = KnockoutTemplateUtils;

        // Handle announcements sent when pages change, for Accessibility.
        this.manner = ko.observable('polite');
        this.message = ko.observable();

        const announcementHandler = (event) => {
          this.message(event.detail.message);
          this.manner(event.detail.manner);
        };

      document.getElementById('globalBody').addEventListener('announce', announcementHandler, false);

      // Media queries for responsive layouts
      const smQuery = ResponsiveUtils.getFrameworkQuery(ResponsiveUtils.FRAMEWORK_QUERY_KEY.SM_ONLY);
      this.smScreen = ResponsiveKnockoutUtils.createMediaQueryObservable(smQuery);

      const navData = [
        { path: 'lab', detail: { label: '3D Lab', iconClass: 'oj-ux-ico-scatter-plot' } },
        { path: 'insights', detail: { label: 'Insights', iconClass: 'oj-ux-ico-bar-chart' } },
        { path: 'data', detail: { label: 'Data', iconClass: 'oj-ux-ico-table' } },
        { path: 'info', detail: { label: 'Info', iconClass: 'oj-ux-ico-information-s' } }
      ];
      const navPaths = navData.map((item) => item.path);
      const defaultPage = 'lab';
      const routeAliases = {
        dashboard: 'lab',
        incidents: 'insights',
        customers: 'data',
        about: 'info'
      };
      const normalizePage = (page) => {
        const normalized = routeAliases[page] || page || defaultPage;
        return navPaths.indexOf(normalized) >= 0 ? normalized : defaultPage;
      };
      const writeRoute = (page, replace) => {
        const url = new URL(window.location.href);
        if (url.searchParams.get('root') === page) {
          return;
        }
        url.searchParams.set('root', page);
        window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
      };

      this.selectedPage = ko.observable(normalizePage(new URLSearchParams(window.location.search).get('root')));
      this.moduleConfig = ko.pureComputed(() => moduleUtils.createConfig({ name: this.selectedPage() }));
      writeRoute(this.selectedPage(), true);
      this.selectedPage.subscribe((page) => {
        writeRoute(page, false);
      });
      window.addEventListener('popstate', () => {
        this.selectedPage(normalizePage(new URLSearchParams(window.location.search).get('root')));
      });

      this.navDataProvider = new ArrayDataProvider(navData, {keyAttributes: "path"});

      // Header
      // Application Name used in Branding Area
      this.appName = ko.observable("Laptop Atlas");

      // Footer
      this.footerLinks = [
        { name: "Oracle JET Cookbook", linkId: "jetCookbook", linkTarget: "https://www.oracle.com/webfolder/technetwork/jet-910/jetCookbook.html?component=home&demo=all" },
        { name: "Visual Lab", linkId: "visualLab", linkTarget: "?root=lab" },
        { name: "Insights", linkId: "insights", linkTarget: "?root=insights" },
        { name: "Data Explorer", linkId: "dataExplorer", linkTarget: "?root=data" }
      ];
     }

     // release the application bootstrap busy state
     Context.getPageContext().getBusyContext().applicationBootstrapComplete();

     return new ControllerViewModel();
  }
);
