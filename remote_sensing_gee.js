//**********REMOTE SENSING GOOGLE EARTH ENGINE**********
//**********Source MOD13Q1.061 Terra Vegetation Indices 16-Day Global 250m**********
//**********VEGETATION INDICES**********
var DataSet = ee.ImageCollection("MODIS/061/MOD13Q1")
  .filterDate('2024-01-01', '2025-01-01').mean()
  .select('NDVI'); 

//**********MENAMPILKAN NDVI (Normalized Difference Vegetation Index)**********
var NDVI = DataSet.clip(JawaTimur);
var NDVIparam = {
  min: -2000,
  max: 10000,
  palette: ['ffffff', 'ce7e45', 'df923d', 'f1b555', 'fcd163', '99b718', '74a901',
    '66a000', '529400', '3e8601', '207401', '056201', '004c00', '023b01',
    '012e01', '011d01', '011301']
}
Map.addLayer(NDVI, NDVIparam, 'Normalized Difference Vegetation Index (NDVI)');
Map.centerObject(JawaTimur);

//**********REKLASIFIKASI NDVI**********
var ReklasifikasiNDVI = ee.Image(DataSet).clip(JawaTimur)
  .where(DataSet.gt(-2000).and(DataSet.lte(0)), 1)
  .where(DataSet.gt(0).and(DataSet.lte(2000)), 2)
  .where(DataSet.gt(2000).and(DataSet.lte(4000)), 3)
  .where(DataSet.gt(4000).and(DataSet.lte(6000)), 4)
  .where(DataSet.gt(6000).and(DataSet.lte(8000)), 5)
  .where(DataSet.gt(8000).and(DataSet.lte(10000)), 6);

var param = {
  min: 1,
  max: 6,
  palette: ['#ff7700', '#ffe046', '#94bf73', '#739559', '#526a40', '#314026']
};

Map.addLayer(ReklasifikasiNDVI, param, 'Reklasifikasi NDVI');

//**********PERHITUNGAN AREA**********
var Area = ee.Image.pixelArea().divide(10000)//per hektar
  .addBands(ReklasifikasiNDVI)
  .reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'Level'
    }),
    geometry: JawaTimur,
    scale: 250,
    maxPixels: 10e10,
  }).get('groups');
print('Perhitungan Area per Level:', Area);

//**********CHART TIME SERIES PER MONTH**********
//Mendefinisikan ulang band
var dataSet = ee.ImageCollection("MODIS/061/MOD13Q1")
  .filterDate('2024-01-01', '2025-01-01')
  .select('NDVI');

//Menghitung rata-rata NDVI bulanan
var hitungBulanan = function(bulan) {
  bulan = ee.Number(bulan);
  var gambarBulanan = dataSet
    .filter(ee.Filter.calendarRange(bulan, bulan, 'month'))
    .mean()
    .set('Bulan', bulan)
    .set('system:time_start', ee.Date.fromYMD(2024, bulan, 1));
  return gambarBulanan;
};

var bulan = ee.List.sequence(1, 12);
var koleksiBulanan = ee.ImageCollection(bulan.map(hitungBulanan));
print('Koleksi Bulanan:', koleksiBulanan)

//Membuat chart
var chartForConsole = ui.Chart.image.series({
  imageCollection: koleksiBulanan,
  region: geometry,
  reducer: ee.Reducer.mean(),
  scale: 250,
  xProperty: 'system:time_start',
});
chartForConsole.setChartType('LineChart')
chartForConsole.setOptions({
  title: 'PERUBAHAN RATA-RATA INDEKS VEGETASI PROVINSI JAWA TIMUR TAHUN 2024',
  hAxis: {title: 'Waktu', format: 'MM-yyyy'},
  vAxis: {title: 'Indeks Vegetasi'},
  lineWidth: 2,
  pointSize: 3,
});
print(chartForConsole);

//**********ADD LAYOUT**********
//User Interface(UI) Map
var mapPanel = ui.Map();
mapPanel.addLayer(ReklasifikasiNDVI, param, 'Reklasifikasi NDVI');
mapPanel.centerObject(JawaTimur);

//Panel UI
var inspectorPanel = ui.Panel({
  style: {
    position: 'top-left',
    width: '300px',
    padding: '8px'
  }
});

//Judul dan Deskripsi
var intro = ui.Panel([
  ui.Label({
    value: 'INDEKS RATA-RATA VEGETASI PROVINSI JAWA TIMUR TAHUN 2024',
    style: {fontSize: '20px', fontWeight: 'bold'}
  }),
  ui.Label({
    value: 'Peta ini menampilkan rata-rata indeks vegetasi, atau umum dikenal sebagai Normalized Difference Vegetation Index (NDVI), di Provinsi Jawa Timur pada tahun 2024.',
    style: {fontSize: '12px', textAlign: 'justify'}
  })
]);
inspectorPanel.add(intro);

//Judul Legenda
var legendTitle = ui.Label({
  value: 'Legenda Indeks Vegetasi',
  style: {fontWeight: 'bold'}
});
inspectorPanel.add(legendTitle);

//Legenda Warna
function Legenda(kotak, label) {
  //Kotak Warna
  var kotakWarna = ui.Panel({
    style: {
      width: '20px',
      height: '20px',
      backgroundColor: kotak,
      border: '1px solid #000000',
      margin: '0 5px 0 0',
    }
  });
  
  //Label
  var teksLabel = ui.Label({
    value: label,
    style: {fontSize: '12px', color: '#000000'},
  });
  
  //Menggabungkan Kotak dan Label
  var komponenLegenda = ui.Panel({
    widgets: [kotakWarna, teksLabel],
    layout: ui.Panel.Layout.flow('horizontal')
  });
  
  return komponenLegenda;
}

//Membuat Panel Utama Legenda
var panelLegenda = ui.Panel ({
  widgets: [
    Legenda('#ff7700', '-0.2 s.d. 0'),
    Legenda('#ffe046', '0 s.d. 0.2'),
    Legenda('#94bf73', '0.2 s.d. 0.4'),
    Legenda('#739559', '0.4 s.d. 0.6'),
    Legenda('#526a40', '0.6 s.d. 0.8'),
    Legenda('#314026', '0.8 s.d. 1'),
    ],
  layout: ui.Panel.Layout.flow('vertical'),
  style: {
    position: 'bottom-right', // Posisi panel di peta
    padding: '10px', // Jarak antara tepi dan konten
    backgroundColor: '#FFFFFF', // Warna latar belakang panel
    }  
});
inspectorPanel.add(panelLegenda);

//Sumber Data dan URL 
var sumberLabel = ui.Label({
  value: 'Sumber: MOD13Q1.061 Terra Vegetation Indices 16-Day Global 250m',
  style: {fontWeight: 'bold', color: 'black'},
  targetUrl: 'https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MOD13Q1'
});
inspectorPanel.add(sumberLabel);

// Tambahkan Panel ke UI
ui.root.clear();
ui.root.add(mapPanel);
mapPanel.add(inspectorPanel);