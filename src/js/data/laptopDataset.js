define(['text!./laptop-data.csv'], function(csvText) {
  'use strict';

  const palette = [
    '#f3efe6', '#d6c6a8', '#ffffff', '#b8aa92', '#8f8474',
    '#c7ccd1', '#f7d08a', '#b7d7d8', '#d9d9d9', '#a99d8d',
    '#ece1cd', '#f8f5ee'
  ];

  const sceneConfigs = [
    {
      id: 'performance',
      label: 'Performance',
      iconClass: 'oj-ux-ico-dashboard',
      title: 'Performance Surface',
      subtitle: 'CPU clock, price, and memory density across brands',
      colorKey: 'company',
      groupLabel: 'Company',
      axes: {
        x: { key: 'cpuGhz', label: 'CPU GHz', unit: 'GHz' },
        y: { key: 'price', label: 'Price', unit: '₹' },
        z: { key: 'ramGb', label: 'RAM', unit: 'GB' }
      }
    },
    {
      id: 'mobility',
      label: 'Mobility',
      iconClass: 'oj-ux-ico-mobile',
      title: 'Mobility Field',
      subtitle: 'Weight, display size, and pricing tradeoffs by chassis type',
      colorKey: 'typeName',
      groupLabel: 'Type',
      axes: {
        x: { key: 'weightKg', label: 'Weight', unit: 'kg' },
        y: { key: 'price', label: 'Price', unit: '₹' },
        z: { key: 'inches', label: 'Screen', unit: 'in' }
      }
    },
    {
      id: 'display',
      label: 'Display',
      iconClass: 'oj-ux-ico-monitor',
      title: 'Display and Storage Volume',
      subtitle: 'Resolution, storage capacity, and price by operating system',
      colorKey: 'opSys',
      groupLabel: 'OS',
      axes: {
        x: { key: 'displayMp', label: 'Display', unit: 'MP' },
        y: { key: 'price', label: 'Price', unit: '₹' },
        z: { key: 'storageGb', label: 'Storage', unit: 'GB' }
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
    return round(value, axis.unit === 'kg' || axis.unit === 'MP' || axis.unit === 'GHz' ? 2 : 1) + ' ' + axis.unit;
  }

  function colorFor(value) {
    const text = String(value || 'Other');
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

    return {
      id: String(row.SrNo || index),
      srNo: Number.parseInt(row.SrNo, 10),
      company: row.Company,
      typeName: row.TypeName,
      inches: inches,
      screenResolution: row.ScreenResolution,
      cpu: row.Cpu,
      cpuGhz: parseCpuGHz(row.Cpu),
      ram: row.Ram,
      ramGb: parseRam(row.Ram),
      memory: memory,
      storageGb: parseStorageGb(memory),
      storageType: memory.indexOf('SSD') >= 0 ? 'SSD' : memory.indexOf('HDD') >= 0 ? 'HDD' : 'Other',
      gpu: row.Gpu,
      opSys: row.OpSys,
      weight: row.Weight,
      weightKg: parseWeight(row.Weight),
      price: price,
      priceLabel: formatCurrency(price),
      displayMp: resolution.displayMp,
      pixelDensity: pixelDensity,
      resolution: resolution.width && resolution.height ? resolution.width + ' x ' + resolution.height : 'Unknown',
      searchText: [
        row.Company,
        row.TypeName,
        row.ScreenResolution,
        row.Cpu,
        row.Ram,
        row.Memory,
        row.Gpu,
        row.OpSys
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
    return Object.keys(groupRows(list, key))
      .map((group) => {
        const groupRowsValue = groupRows(list, key)[group];
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

  function groupedCount(list, key, limit) {
    return Object.keys(groupRows(list, key))
      .map((group) => ({
        group: group,
        series: group,
        value: groupRows(list, key)[group].length,
        color: colorFor(group)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit || 12);
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
    groupedCount: groupedCount,
    scatterSample: scatterSample,
    colorFor: colorFor,
    formatCurrency: formatCurrency,
    formatCurrencyShort: formatCurrencyShort,
    formatAxisValue: formatAxisValue,
    round: round
  };
});
