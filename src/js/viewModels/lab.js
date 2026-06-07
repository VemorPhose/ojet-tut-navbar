define([
  'knockout',
  '../accUtils',
  '../data/laptopDataset',
  '../viz/threeLaptopScene',
  'ojs/ojarraydataprovider',
  'ojs/ojknockout',
  'ojs/ojnavigationlist',
  'ojs/ojswitcher',
  'ojs/ojselectsingle',
  'ojs/ojslider',
  'ojs/ojbutton',
  'ojs/ojchart',
  'ojs/ojprogress-bar',
  'ojs/ojformlayout'
], function(ko, accUtils, dataset, threeLaptopScene, ArrayDataProvider) {
  'use strict';

  function LabViewModel() {
    const self = this;
    let currentScene = null;
    let renderTimer = null;
    let renderToken = 0;

    this.sceneConfigs = dataset.sceneConfigs;
    this.selectedScene = ko.observable(dataset.sceneConfigs[0].id);
    this.companyFilter = ko.observable('all');
    this.typeFilter = ko.observable('all');
    this.osFilter = ko.observable('all');
    this.priceLimit = ko.observable(Math.ceil(dataset.summary.maxPrice));
    this.priceMin = Math.floor(dataset.summary.minPrice);
    this.priceMax = Math.ceil(dataset.summary.maxPrice);
    this.priceStep = 2500;

    this.companyOptionsDP = new ArrayDataProvider(dataset.companyOptions, { keyAttributes: 'value' });
    this.typeOptionsDP = new ArrayDataProvider(dataset.typeOptions, { keyAttributes: 'value' });
    this.osOptionsDP = new ArrayDataProvider(dataset.osOptions, { keyAttributes: 'value' });
    this.ramChartGroups = ko.observableArray([]);
    this.ramChartSeries = ko.observableArray([]);
    this.brandChartGroups = ko.observableArray([]);
    this.brandChartSeries = ko.observableArray([]);
    this.portabilitySeries = ko.observableArray([]);

    this.totalCount = dataset.summary.total;
    this.summary = dataset.summary;

    this.activeScene = ko.pureComputed(function() {
      return dataset.sceneConfigById(self.selectedScene());
    });

    this.filteredRows = ko.pureComputed(function() {
      return dataset.filterRows({
        company: self.companyFilter(),
        typeName: self.typeFilter(),
        opSys: self.osFilter(),
        maxPrice: self.priceLimit()
      });
    });

    this.visibleCount = ko.pureComputed(function() {
      return self.filteredRows().length;
    });

    this.coveragePercent = ko.pureComputed(function() {
      return Math.round((self.visibleCount() / self.totalCount) * 100);
    });

    this.medianPriceLabel = ko.pureComputed(function() {
      return dataset.formatCurrencyShort(dataset.median(self.filteredRows().map((row) => row.price)));
    });

    this.medianWeightLabel = ko.pureComputed(function() {
      return dataset.round(dataset.median(self.filteredRows().map((row) => row.weightKg)), 2) + ' kg';
    });

    this.medianRamLabel = ko.pureComputed(function() {
      return dataset.round(dataset.median(self.filteredRows().map((row) => row.ramGb)), 1) + ' GB';
    });

    this.medianStorageLabel = ko.pureComputed(function() {
      return Math.round(dataset.median(self.filteredRows().map((row) => row.storageGb))) + ' GB';
    });

    this.axisBadges = ko.pureComputed(function() {
      const config = self.activeScene();
      return [
        { label: 'X', value: config.axes.x.label },
        { label: 'Y', value: config.axes.y.label },
        { label: 'Z', value: config.axes.z.label },
        { label: 'Color', value: config.groupLabel }
      ];
    });

    this.sceneRangeText = ko.pureComputed(function() {
      const config = self.activeScene();
      const rows = self.filteredRows();
      if (!rows.length) {
        return 'No rows match the current filters';
      }
      const axis = config.axes;
      return 'Shown 4th-96th percentile: ' + [
        axis.x.label + ' ' + axisRange(rows, axis.x),
        axis.y.label + ' ' + axisRange(rows, axis.y),
        axis.z.label + ' ' + axisRange(rows, axis.z)
      ].join(' / ');
    });

    this.resetFilters = function() {
      self.companyFilter('all');
      self.typeFilter('all');
      self.osFilter('all');
      self.priceLimit(self.priceMax);
    };

    this.scheduleRender = function() {
      window.clearTimeout(renderTimer);
      renderTimer = window.setTimeout(function() {
        self.renderScene();
      }, 80);
    };

    this.renderScene = function() {
      const config = self.activeScene();
      const container = document.getElementById('sceneMount-' + config.id);
      const rows = self.filteredRows();
      const token = renderToken + 1;
      renderToken = token;

      if (!container) {
        return;
      }

      if (currentScene) {
        currentScene.destroy();
        currentScene = null;
      }

      container.textContent = '';
      const loading = document.createElement('div');
      loading.className = 'scene-loading';
      loading.textContent = rows.length ? 'Rendering ' + rows.length + ' laptops' : 'No matching laptops';
      container.appendChild(loading);

      threeLaptopScene.createLaptopScene(container, {
        rows: rows,
        config: config,
        colorFor: dataset.colorFor,
        formatAxisValue: dataset.formatAxisValue
      }).then(function(sceneApi) {
        if (token !== renderToken) {
          sceneApi.destroy();
          return;
        }
        currentScene = sceneApi;
      }).catch(function(error) {
        container.textContent = '';
        const message = document.createElement('div');
        message.className = 'scene-error';
        message.textContent = 'The 3D renderer could not be loaded.';
        container.appendChild(message);
        console.error(error);
      });
    };

    this.updateCharts = function() {
      const rows = self.filteredRows();
      const ramChart = dataset.ramPriceStats(rows).filter((item) => item.count >= 3);
      const brandChart = dataset.rankedMedian(rows, 'company', 'price', 8, 10);
      self.ramChartGroups(ramChart.map((item) => item.group));
      self.ramChartSeries(dataset.groupedBarSeries(ramChart, 'Median price'));
      self.brandChartGroups(brandChart.map((item) => item.group));
      self.brandChartSeries(dataset.groupedBarSeries(brandChart, 'Median price'));
      self.portabilitySeries(dataset.scatterSeries(rows, 'weightKg', 'logPrice', 'typeName', 6));
    };

    function refresh() {
      self.updateCharts();
      self.scheduleRender();
    }

    [this.companyFilter, this.typeFilter, this.osFilter, this.priceLimit, this.selectedScene].forEach(function(observable) {
      observable.subscribe(refresh);
    });

    this.connected = function() {
      accUtils.announce('3D Lab page loaded.');
      document.title = 'Laptop Atlas - 3D Lab';
      self.updateCharts();
      self.scheduleRender();
    };

    this.disconnected = function() {
      window.clearTimeout(renderTimer);
      renderToken += 1;
      if (currentScene) {
        currentScene.destroy();
        currentScene = null;
      }
    };

    this.transitionCompleted = function() {
      self.scheduleRender();
    };
  }

  function axisRange(rows, axis) {
    const values = rows.map((row) => row[axis.key]).filter((value) => Number.isFinite(value));
    if (!values.length) {
      return '0';
    }
    const min = dataset.quantile(values, 0.04);
    const max = dataset.quantile(values, 0.96);
    return dataset.formatAxisValue(min, axis) + ' to ' + dataset.formatAxisValue(max, axis);
  }

  return LabViewModel;
});
