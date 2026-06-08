define(['text!./laptop-data.csv'], function(csvText) {
  'use strict';

  const palette = [
    '#FE5F55', '#BDD5EA', '#577399', '#F7F7FF', '#495867',
    '#FF837B', '#9FBDD6', '#6C86AA', '#DCEBFA', '#354555'
  ];

  const namedColors = {
    Gaming: '#FE5F55',
    Workstation: '#F7F7FF',
    Ultrabook: '#BDD5EA',
    Notebook: '#577399',
    Netbook: '#9FBDD6',
    '2 in 1 Convertible': '#FF837B',
    SSD: '#BDD5EA',
    HDD: '#FE5F55',
    Hybrid: '#577399',
    Flash: '#F7F7FF',
    Other: '#495867',
    Intel: '#BDD5EA',
    AMD: '#FE5F55',
    Nvidia: '#577399',
    Apple: '#F7F7FF',
    Windows: '#BDD5EA',
    macOS: '#F7F7FF',
    Linux: '#495867',
    Chrome: '#577399',
    None: '#495867'
  };

  const sceneConfigs = [
    {
      id: 'performance',
      label: 'Performance',
      iconClass: 'oj-ux-ico-dashboard',
      title: 'Performance Price Cloud',
      subtitle: 'RAM, CPU speed, and log-scaled price with robust percentile axes',
      colorKey: 'typeName',
      groupLabel: 'Type',
      axes: {
        x: { key: 'ramGb', label: 'RAM', unit: 'GB' },
        y: { key: 'price', label: 'Price', unit: '₹', transform: 'log' },
        z: { key: 'cpuGhz', label: 'CPU GHz', unit: 'GHz' }
      }
    },
    {
      id: 'mobility',
      label: 'Mobility',
      iconClass: 'oj-ux-ico-mobile',
      title: 'Portability Premium',
      subtitle: 'Weight, screen size, and log-scaled price by chassis type',
      colorKey: 'typeName',
      groupLabel: 'Type',
      axes: {
        x: { key: 'weightKg', label: 'Weight', unit: 'kg' },
        y: { key: 'price', label: 'Price', unit: '₹', transform: 'log' },
        z: { key: 'inches', label: 'Screen', unit: 'in' }
      }
    },
    {
      id: 'display',
      label: 'Display',
      iconClass: 'oj-ux-ico-monitor',
      title: 'Display and Storage Value',
      subtitle: 'Pixel density, storage capacity, and log-scaled price by storage class',
      colorKey: 'storageClass',
      groupLabel: 'Storage',
      axes: {
        x: { key: 'pixelDensity', label: 'Pixel density', unit: 'ppi' },
        y: { key: 'price', label: 'Price', unit: '₹', transform: 'log' },
        z: { key: 'storageGb', label: 'Storage', unit: 'GB', transform: 'log' }
      }
    }
  ];

  function parseCsv(text) {
    const rows = [];
    let field = '';
    let row = [];
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];

      if (char === '"') {
        if (quoted && next === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (char === ',' && !quoted) {
        row.push(field);
        field = '';
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && next === '\n') {
          index += 1;
        }
        row.push(field);
        if (row.some((value) => value !== '')) {
          rows.push(row);
        }
        field = '';
        row = [];
      } else {
        field += char;
      }
    }

    if (field || row.length) {
      row.push(field);
      rows.push(row);
    }

    const headers = rows.shift();
    return rows.map((values) => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = values[index] || '';
      });
      return item;
    });
  }

  function number(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function parseRam(value) {
    return number(String(value).replace('GB', ''));
  }

  function parseWeight(value) {
    return number(String(value).replace('kg', ''));
  }

  function parseCpuGHz(value) {
    const match = String(value).match(/([0-9.]+)\s*GHz/i);
    return match ? number(match[1]) : 0;
  }

  function parseStorageGb(value) {
    let total = 0;
    const matcher = /([0-9.]+)\s*(TB|GB)/ig;
    let match = matcher.exec(value);

    while (match) {
      total += number(match[1]) * (match[2].toUpperCase() === 'TB' ? 1024 : 1);
      match = matcher.exec(value);
    }

    return total;
  }

  function parseStorageClass(value) {
    const text = String(value).toUpperCase();
    const hasSsd = text.indexOf('SSD') >= 0;
    const hasHdd = text.indexOf('HDD') >= 0;
    if (hasSsd && hasHdd) {
      return 'Hybrid';
    }
    if (hasSsd) {
      return 'SSD';
    }
    if (hasHdd) {
      return 'HDD';
    }
    if (text.indexOf('FLASH') >= 0) {
      return 'Flash';
    }
    return 'Other';
  }

  function parseCpuBrand(value) {
    const text = String(value);
    if (/Intel/i.test(text)) {
      return 'Intel';
    }
    if (/AMD/i.test(text)) {
      return 'AMD';
    }
    if (/Samsung/i.test(text)) {
      return 'Samsung';
    }
    return 'Other';
  }

  function parseGpuBrand(value) {
    const text = String(value);
    if (/Nvidia|GeForce|GTX|Quadro/i.test(text)) {
      return 'Nvidia';
    }
    if (/AMD|Radeon|FirePro/i.test(text)) {
      return 'AMD';
    }
    if (/Intel|Iris|HD Graphics|UHD/i.test(text)) {
      return 'Intel';
    }
    return 'Other';
  }

  function normalizeOs(value) {
    const text = String(value);
    if (/Windows/i.test(text)) {
      return 'Windows';
    }
    if (/mac|OS X/i.test(text)) {
      return 'macOS';
    }
    if (/Linux/i.test(text)) {
      return 'Linux';
    }
    if (/Chrome/i.test(text)) {
      return 'Chrome';
    }
    if (/No OS/i.test(text)) {
      return 'None';
    }
    return text || 'Other';
  }

  function parseResolution(value) {
    const matches = String(value).match(/(\d{3,4})x(\d{3,4})/g);
    if (!matches || !matches.length) {
      return { width: 0, height: 0, displayMp: 0, pixelDensity: 0 };
    }
    const parts = matches[matches.length - 1].split('x').map((part) => Number.parseInt(part, 10));
    return {
      width: parts[0],
      height: parts[1],
      displayMp: (parts[0] * parts[1]) / 1000000,
      pixelDensity: 0
    };
  }

  function average(values) {
    const filtered = values.filter((value) => Number.isFinite(value) && value > 0);
    if (!filtered.length) {
      return 0;
    }
    return filtered.reduce((total, value) => total + value, 0) / filtered.length;
  }

  function quantile(values, percentile) {
    const filtered = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
    if (!filtered.length) {
      return 0;
    }
    const index = (filtered.length - 1) * percentile;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) {
      return filtered[lower];
    }
    return filtered[lower] + (filtered[upper] - filtered[lower]) * (index - lower);
  }

  function median(values) {
    return quantile(values, 0.5);
  }

  function max(values) {
    return Math.max.apply(null, values.filter((value) => Number.isFinite(value)));
  }

  function min(values) {
    return Math.min.apply(null, values.filter((value) => Number.isFinite(value)));
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  function round(value, digits) {
    const scale = Math.pow(10, digits || 0);
    return Math.round(value * scale) / scale;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  function formatCurrencyShort(value) {
    if (!Number.isFinite(value)) {
      return '₹0';
    }
    if (value >= 100000) {
      return '₹' + round(value / 100000, 1) + 'L';
    }
    if (value >= 1000) {
      return '₹' + Math.round(value / 1000) + 'K';
    }
    return formatCurrency(value);
  }

  function formatAxisValue(value, axis) {
    if (!axis || axis.unit === '₹') {
      return formatCurrencyShort(value);
    }
    if (axis.unit === 'GB') {
      return Math.round(value) + ' GB';
    }
    if (axis.unit === 'ppi') {
      return Math.round(value) + ' ppi';
    }
    return round(value, axis.unit === 'kg' || axis.unit === 'MP' || axis.unit === 'GHz' ? 2 : 1) + ' ' + axis.unit;
  }

  function colorFor(value) {
    const text = String(value || 'Other');
    if (namedColors[text]) {
      return namedColors[text];
    }
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
      hash = ((hash << 5) - hash) + text.charCodeAt(index);
      hash |= 0;
    }
    return palette[Math.abs(hash) % palette.length];
  }

  const rows = parseCsv(csvText).map((row, index) => {
    const resolution = parseResolution(row.ScreenResolution);
    const inches = number(row.Inches);
    const diagonalPixels = Math.sqrt(Math.pow(resolution.width, 2) + Math.pow(resolution.height, 2));
    const pixelDensity = inches ? diagonalPixels / inches : 0;
    const price = number(row.Price);
    const memory = row.Memory || '';
    const storageClass = parseStorageClass(memory);

    return {
      id: String(row.SrNo || index),
      srNo: Number.parseInt(row.SrNo, 10),
      company: row.Company,
      typeName: row.TypeName,
      inches: inches,
      screenResolution: row.ScreenResolution,
      cpu: row.Cpu,
      cpuBrand: parseCpuBrand(row.Cpu),
      cpuGhz: parseCpuGHz(row.Cpu),
      ram: row.Ram,
      ramGb: parseRam(row.Ram),
      memory: memory,
      storageGb: parseStorageGb(memory),
      storageType: storageClass,
      storageClass: storageClass,
      gpu: row.Gpu,
      gpuBrand: parseGpuBrand(row.Gpu),
      opSys: row.OpSys,
      osFamily: normalizeOs(row.OpSys),
      weight: row.Weight,
      weightKg: parseWeight(row.Weight),
      price: price,
      logPrice: Math.log10(Math.max(price, 1)),
      priceLabel: formatCurrency(price),
      displayMp: resolution.displayMp,
      pixelDensity: pixelDensity,
      resolution: resolution.width && resolution.height ? resolution.width + ' x ' + resolution.height : 'Unknown',
      searchText: [
        row.Company,
        row.TypeName,
        row.ScreenResolution,
        row.Cpu,
        parseCpuBrand(row.Cpu),
        row.Ram,
        row.Memory,
        row.Gpu,
        parseGpuBrand(row.Gpu),
        row.OpSys,
        normalizeOs(row.OpSys)
      ].join(' ').toLowerCase()
    };
  });

  const summary = {
    total: rows.length,
    companyCount: unique(rows.map((row) => row.company)).length,
    typeCount: unique(rows.map((row) => row.typeName)).length,
    osCount: unique(rows.map((row) => row.opSys)).length,
    avgPrice: average(rows.map((row) => row.price)),
    avgWeight: average(rows.map((row) => row.weightKg)),
    avgRam: average(rows.map((row) => row.ramGb)),
    avgStorage: average(rows.map((row) => row.storageGb)),
    minPrice: min(rows.map((row) => row.price)),
    maxPrice: max(rows.map((row) => row.price)),
    maxStorage: max(rows.map((row) => row.storageGb)),
    maxRam: max(rows.map((row) => row.ramGb))
  };

  function groupRows(list, key) {
    return list.reduce((groups, row) => {
      const group = row[key] || 'Other';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(row);
      return groups;
    }, {});
  }

  function rankedAverage(list, key, metric, limit) {
    const groups = groupRows(list, key);
    return Object.keys(groups)
      .map((group) => {
        const groupRowsValue = groups[group];
        return {
          group: group,
          series: metric === 'price' ? 'Average price' : metric,
          value: average(groupRowsValue.map((row) => row[metric])),
          count: groupRowsValue.length,
          color: colorFor(group)
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, limit || 10);
  }

  function rankedMedian(list, key, metric, limit, minimumCount) {
    const groups = groupRows(list, key);
    return Object.keys(groups)
      .map((group) => {
        const groupRowsValue = groups[group];
        const values = groupRowsValue.map((row) => row[metric]).filter((value) => Number.isFinite(value) && value > 0);
        return {
          group: group,
          series: metric === 'price' ? 'Median price' : metric,
          value: median(values),
          avg: average(values),
          p25: quantile(values, 0.25),
          p75: quantile(values, 0.75),
          count: groupRowsValue.length,
          color: colorFor(group)
        };
      })
      .filter((item) => item.count >= (minimumCount || 1))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit || 10);
  }

  function groupedCount(list, key, limit) {
    const groups = groupRows(list, key);
    return Object.keys(groups)
      .map((group) => ({
        group: group,
        series: group,
        value: groups[group].length,
        color: colorFor(group)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit || 12);
  }

  function groupedBarSeries(stats, seriesName) {
    return [{
      name: seriesName || 'Median price',
      color: '#FE5F55',
      items: stats.map((item) => ({
        value: item.value,
        color: item.color,
        shortDesc: item.group + ': ' + formatCurrencyShort(item.value) + ' median, ' + item.count + ' models'
      }))
    }];
  }

  function ramPriceStats(list) {
    const stats = rankedMedian(list, 'ramGb', 'price', 20, 1)
      .sort((a, b) => Number(a.group) - Number(b.group));
    return stats.map((item) => ({
      group: item.group + ' GB',
      value: item.value,
      count: item.count,
      color: '#BDD5EA'
    }));
  }

  function storagePremiumStats(list) {
    const typeGroups = groupRows(list, 'typeName');
    const types = Object.keys(typeGroups)
      .map((type) => ({ type: type, count: typeGroups[type].length }))
      .filter((item) => item.count >= 20)
      .sort((a, b) => b.count - a.count)
      .map((item) => item.type);

    const storageClasses = ['SSD', 'HDD', 'Hybrid'];
    const series = storageClasses.map((storageClass) => ({
      name: storageClass,
      color: colorFor(storageClass),
      items: types.map((type) => {
        const values = typeGroups[type]
          .filter((row) => row.storageClass === storageClass)
          .map((row) => row.price);
        return values.length ? { value: median(values), shortDesc: type + ' ' + storageClass + ': ' + formatCurrencyShort(median(values)) } : null;
      })
    }));

    return { groups: types, series: series };
  }

  function scatterSeries(list, xKey, yKey, groupKey, limit) {
    const byGroup = groupRows(list, groupKey);
    return Object.keys(byGroup)
      .sort((a, b) => byGroup[b].length - byGroup[a].length)
      .slice(0, limit || 8)
      .map((group) => ({
        name: group,
        color: colorFor(group),
        items: byGroup[group]
          .filter((row) => Number.isFinite(row[xKey]) && Number.isFinite(row[yKey]))
          .slice(0, 220)
          .map((row) => ({
            x: row[xKey],
            y: row[yKey],
            markerSize: row.ramGb >= 16 ? 9 : row.ramGb >= 8 ? 7 : 5,
            shortDesc: row.company + ' ' + row.typeName + ': ' + formatCurrencyShort(row.price)
          }))
      }));
  }

  function scatterSample(list, xKey, yKey, groupKey, limit) {
    const source = list.slice().sort((a, b) => b.price - a.price);
    return source.slice(0, limit || 180).map((row) => ({
      id: row.id,
      group: row.company,
      series: row[groupKey] || 'Other',
      x: row[xKey],
      y: row[yKey],
      label: row.company + ' ' + row.typeName,
      color: colorFor(row[groupKey])
    }));
  }

  function selectOptions(values, allLabel) {
    return [{ value: 'all', label: allLabel }].concat(unique(values).map((value) => ({
      value: value,
      label: value
    })));
  }

  function filterRows(filters) {
    const options = filters || {};
    const search = String(options.search || '').trim().toLowerCase();
    const company = options.company || 'all';
    const typeName = options.typeName || 'all';
    const opSys = options.opSys || 'all';
    const maxPrice = Number(options.maxPrice) || summary.maxPrice;

    return rows.filter((row) => (
      (company === 'all' || row.company === company) &&
      (typeName === 'all' || row.typeName === typeName) &&
      (opSys === 'all' || row.opSys === opSys) &&
      row.price <= maxPrice &&
      (!search || row.searchText.indexOf(search) >= 0)
    ));
  }

  function sceneConfigById(id) {
    return sceneConfigs.find((config) => config.id === id) || sceneConfigs[0];
  }

  return {
    rows: rows,
    summary: summary,
    sceneConfigs: sceneConfigs,
    sceneConfigById: sceneConfigById,
    companyOptions: selectOptions(rows.map((row) => row.company), 'All companies'),
    typeOptions: selectOptions(rows.map((row) => row.typeName), 'All types'),
    osOptions: selectOptions(rows.map((row) => row.opSys), 'All operating systems'),
    filterRows: filterRows,
    rankedAverage: rankedAverage,
    rankedMedian: rankedMedian,
    groupedCount: groupedCount,
    groupedBarSeries: groupedBarSeries,
    ramPriceStats: ramPriceStats,
    storagePremiumStats: storagePremiumStats,
    scatterSample: scatterSample,
    scatterSeries: scatterSeries,
    colorFor: colorFor,
    formatCurrency: formatCurrency,
    formatCurrencyShort: formatCurrencyShort,
    formatAxisValue: formatAxisValue,
    average: average,
    median: median,
    quantile: quantile,
    round: round
  };
});
