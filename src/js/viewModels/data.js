define([
  'knockout',
  '../accUtils',
  '../data/laptopDataset',
  'ojs/ojarraydataprovider',
  'ojs/ojknockout',
  'ojs/ojtable',
  'ojs/ojselectsingle',
  'ojs/ojinputtext',
  'ojs/ojbutton',
  'ojs/ojformlayout'
], function(ko, accUtils, dataset, ArrayDataProvider) {
  'use strict';

  function DataViewModel() {
    const self = this;

    this.companyFilter = ko.observable('all');
    this.typeFilter = ko.observable('all');
    this.osFilter = ko.observable('all');
    this.searchQuery = ko.observable('');
    this.companyOptionsDP = new ArrayDataProvider(dataset.companyOptions, { keyAttributes: 'value' });
    this.typeOptionsDP = new ArrayDataProvider(dataset.typeOptions, { keyAttributes: 'value' });
    this.osOptionsDP = new ArrayDataProvider(dataset.osOptions, { keyAttributes: 'value' });
    this.tableDP = ko.observable(new ArrayDataProvider([], { keyAttributes: 'id' }));
    this.resultCount = ko.observable(dataset.rows.length);

    this.columns = [
      { headerText: 'Company', field: 'company', resizable: 'enabled' },
      { headerText: 'Type', field: 'typeName', resizable: 'enabled' },
      { headerText: 'Price', field: 'priceLabel', resizable: 'enabled' },
      { headerText: 'RAM', field: 'ram', resizable: 'enabled' },
      { headerText: 'Storage', field: 'memory', resizable: 'enabled' },
      { headerText: 'CPU', field: 'cpu', resizable: 'enabled' },
      { headerText: 'Display', field: 'resolution', resizable: 'enabled' },
      { headerText: 'Weight', field: 'weight', resizable: 'enabled' },
      { headerText: 'OS', field: 'opSys', resizable: 'enabled' }
    ];

    this.updateTable = function() {
      const rows = dataset.filterRows({
        company: self.companyFilter(),
        typeName: self.typeFilter(),
        opSys: self.osFilter(),
        maxPrice: dataset.summary.maxPrice,
        search: self.searchQuery()
      });
      self.resultCount(rows.length);
      self.tableDP(new ArrayDataProvider(rows, { keyAttributes: 'id' }));
    };

    this.resetFilters = function() {
      self.companyFilter('all');
      self.typeFilter('all');
      self.osFilter('all');
      self.searchQuery('');
    };

    [this.companyFilter, this.typeFilter, this.osFilter, this.searchQuery].forEach(function(observable) {
      observable.subscribe(self.updateTable);
    });

    this.connected = function() {
      accUtils.announce('Data Explorer page loaded.');
      document.title = 'Laptop Atlas - Data Explorer';
      self.updateTable();
    };

    this.disconnected = function() {};
    this.transitionCompleted = function() {};
  }

  return DataViewModel;
});
