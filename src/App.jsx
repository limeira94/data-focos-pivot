// File: src/App.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import PivotTableUI from 'react-pivottable/PivotTableUI';
import 'react-pivottable/pivottable.css';
import TableRenderers from 'react-pivottable/TableRenderers';
import Plot from 'react-plotly.js';
import createPlotlyRenderers from 'react-pivottable/PlotlyRenderers';
import './App.css';

// Create Plotly renderers
const PlotlyRenderers = createPlotlyRenderers(Plot);

function App() {
  const [fireData, setFireData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pivotState, setPivotState] = useState({});
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use a proxy to avoid CORS issues
      const response = await axios.get('/api/queimadas/geoserver/wfs', {
        params: {
          service: 'WFS',
          version: '1.0.0',
          request: 'GetFeature',
          typeName: 'bdqueimadas:focos',
          outputFormat: 'application/json',
          CQL_FILTER: "data_hora_gmt between '2025-03-13' and '2025-03-14' AND satelite in ('AQUA_M-T') AND continente_id = 8",
          srsName: 'EPSG:3857'
        }
      });
      
      // Process the data for pivot table format
      const processedData = processGeoJSON(response.data);
      setFireData(processedData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data. Using example data instead.');
      // Use example data as fallback
      setFireData(processExampleData());
    } finally {
      setLoading(false);
    }
  };
  
  // Process GeoJSON to flat array for pivot table
  const processGeoJSON = (geoJSON) => {
    if (!geoJSON || !geoJSON.features || !geoJSON.features.length) {
      return [];
    }
    
    return geoJSON.features.map(feature => {
      // Extract properties
      const props = { ...feature.properties };
      
      // Format date if exists
      if (props.data_hora_gmt) {
        const date = new Date(props.data_hora_gmt);
        props.data_hora_gmt = date.toLocaleString();
        props.data = date.toLocaleDateString();
        props.hora = date.toLocaleTimeString();
      }
      
      // Convert coordinates if needed
      if (feature.geometry && feature.geometry.coordinates) {
        if (!props.latitude || !props.longitude) {
          const { lat, lng } = webMercatorToLatLng(
            feature.geometry.coordinates[0],
            feature.geometry.coordinates[1]
          );
          props.latitude = lat;
          props.longitude = lng;
        }
      }
      
      // Remove unnecessary properties
      const excludeProps = ['id_importacao_bdq', 'id_foco_bdq', 'geometry_name'];
      excludeProps.forEach(prop => delete props[prop]);
      
      return props;
    });
  };
  
  // Example data as fallback
  const processExampleData = () => {
    const mockData = {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "id": "focos.fid--4c2a18a0_195950c6af6_-29dd",
          "geometry": {
            "type": "Point",
            "coordinates": [-4611423.26445, -2501313.424355]
          },
          "geometry_name": "geometria",
          "properties": {
            "id_importacao_bdq": null,
            "id_foco_bdq": 1751775438,
            "longitude": -41.42512,
            "latitude": -21.91492,
            "data_hora_gmt": "2025-03-13T17:34:00-03:00",
            "satelite": "AQUA_M-T",
            "municipio": "CAMPOS DOS GOYTACAZES",
            "estado": "RIO DE JANEIRO",
            "pais": "Brasil",
            "precipitacao": 1.45,
            "numero_dias_sem_chuva": 2,
            "risco_fogo": 0.73,
            "bioma": "Mata Atlântica",
            "frp": 11.7
          }
        },
        {
          "type": "Feature",
          "id": "focos.fid--4c2a18a0_195950c6af6_-29dc",
          "geometry": {
            "type": "Point",
            "coordinates": [-4754391.999671, -2464893.104128]
          },
          "geometry_name": "geometria",
          "properties": {
            "id_importacao_bdq": null,
            "id_foco_bdq": 1751775439,
            "longitude": -42.7123,
            "latitude": -21.59411,
            "data_hora_gmt": "2025-03-13T17:35:00-03:00",
            "satelite": "AQUA_M-T",
            "municipio": "MURIAÉ",
            "estado": "MINAS GERAIS",
            "pais": "Brasil",
            "precipitacao": 0.95,
            "numero_dias_sem_chuva": 3,
            "risco_fogo": 0.82,
            "bioma": "Mata Atlântica",
            "frp": 23.5
          }
        },
        {
          "type": "Feature",
          "id": "focos.fid--4c2a18a0_195950c6af6_-29db",
          "geometry": {
            "type": "Point",
            "coordinates": [-5754391.999671, -1464893.104128]
          },
          "geometry_name": "geometria",
          "properties": {
            "id_importacao_bdq": null,
            "id_foco_bdq": 1751775440,
            "longitude": -51.7123,
            "latitude": -13.59411,
            "data_hora_gmt": "2025-03-13T18:15:00-03:00",
            "satelite": "AQUA_M-T",
            "municipio": "PALMAS",
            "estado": "TOCANTINS",
            "pais": "Brasil",
            "precipitacao": 0.15,
            "numero_dias_sem_chuva": 15,
            "risco_fogo": 0.95,
            "bioma": "Cerrado",
            "frp": 35.8
          }
        },
        {
          "type": "Feature",
          "id": "focos.fid--4c2a18a0_195950c6af6_-29da",
          "geometry": {
            "type": "Point",
            "coordinates": [-6754391.999671, -3464893.104128]
          },
          "geometry_name": "geometria",
          "properties": {
            "id_importacao_bdq": null,
            "id_foco_bdq": 1751775441,
            "longitude": -60.7123,
            "latitude": -30.59411,
            "data_hora_gmt": "2025-03-13T19:20:00-03:00",
            "satelite": "AQUA_M-T",
            "municipio": "PORTO ALEGRE",
            "estado": "RIO GRANDE DO SUL",
            "pais": "Brasil",
            "precipitacao": 0.05,
            "numero_dias_sem_chuva": 8,
            "risco_fogo": 0.88,
            "bioma": "Pampa",
            "frp": 9.2
          }
        }
      ]
    };
    
    return processGeoJSON(mockData);
  };
  
  // Convert Web Mercator to Lat/Lng
  const webMercatorToLatLng = (x, y) => {
    const earthRadius = 6378137;
    const originShift = Math.PI * earthRadius;
    
    const lng = (x / originShift) * 180;
    let lat = (y / originShift) * 180;
    
    lat = 180/Math.PI * (2 * Math.atan(Math.exp(lat * Math.PI / 180)) - Math.PI / 2);
    
    return { lat, lng };
  };
  
  // Some default configurations for pivot table
  const getDefaultPivotSettings = () => ({
    rows: ['estado', 'municipio'],
    cols: ['bioma'],
    vals: ['frp'],
    aggregatorName: 'Average',
    rendererName: 'Heatmap'
  });
  
  // Reset the pivot table to default settings
  const resetPivotTable = () => {
    setPivotState(getDefaultPivotSettings());
  };

  return (
    <div className="app-container">
      <h1>Fire Hotspots Data Analysis</h1>
      
      {error && <div className="error">{error}</div>}
      
      <div className="controls">
        <button onClick={fetchData} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Data'}
        </button>
        <button onClick={resetPivotTable}>Reset Pivot Settings</button>
      </div>
      
      {loading ? (
        <div className="loading">Loading fire hotspot data...</div>
      ) : (
        <div className="pivot-table-container">
          <PivotTableUI
            data={fireData}
            onChange={s => setPivotState(s)}
            {...pivotState}
            renderers={{
              ...TableRenderers,
              ...PlotlyRenderers
            }}
            {...(Object.keys(pivotState).length === 0 ? getDefaultPivotSettings() : {})}
          />
        </div>
      )}
    </div>
  );
}

export default App;