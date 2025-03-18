// File: src/App.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import PivotTableUI from 'react-pivottable/PivotTableUI';
import 'react-pivottable/pivottable.css';
import TableRenderers from 'react-pivottable/TableRenderers';
import Plot from 'react-plotly.js';
import createPlotlyRenderers from 'react-pivottable/PlotlyRenderers';
import './App.css';

// Available satellites
const SATELLITES = [
    { value: "AQUA_M-T", label: "Satélite referência (Aqua, tarde)" },
    { value: "ALL_SATELLITES", label: "Todos os satélites" },
    { value: "TERRA_M-M", label: "Terra Manhã" },
    { value: "TERRA_M-T", label: "Terra Tarde" },
    { value: "AQUA_M-M", label: "Aqua Manhã" },
    { value: "GOES-16", label: "GOES-16" },
    { value: "NOAA-18", label: "NOAA-18 Tarde" },
    { value: "NOAA-18D", label: "NOAA-18 Manhã" },
    { value: "MSG-03", label: "MSG-03" },
    { value: "METOP-B", label: "METOP-B" },
    { value: "METOP-C", label: "METOP-C" },
    { value: "NOAA-19 Tarde", label: "NOAA-19" },
    { value: "NOAA-19D", label: "NOAA-19 Manhã" },
    { value: "NOAA-20", label: "NOAA-20" },
    { value: "NOAA-21", label: "NOAA-21" },
    { value: "NPP-375 Manhã", label: "NPP-375D" },
    { value: "NPP-375", label: "NPP-375 Tarde" }
];

// Create Plotly renderers
const PlotlyRenderers = createPlotlyRenderers(Plot);

function App() {
  const [fireData, setFireData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pivotState, setPivotState] = useState({});
  
  // Date range state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Satellite selection state
  const [selectedSatellite, setSelectedSatellite] = useState('AQUA_M-T');
  
  // Format date to YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Set default date range (last 2 days)
  useEffect(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);
    
    setStartDate(formatDate(twoDaysAgo));
    setEndDate(formatDate(yesterday));
  }, []);
  
  // Fetch data when component mounts or date range changes
  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [startDate, endDate, selectedSatellite]);
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Build the satellite filter
      let satelliteFilter;
      if (selectedSatellite === 'ALL_SATELLITES') {
        satelliteFilter = ''; // No filter for all satellites
      } else {
        satelliteFilter = ` AND satelite in ('${selectedSatellite}')`;
      }
      
      // Use a proxy to avoid CORS issues
      const response = await axios.get('/api/queimadas/geoserver/wfs', {
        params: {
          service: 'WFS',
          version: '1.0.0',
          request: 'GetFeature',
          typeName: 'bdqueimadas:focos',
          outputFormat: 'application/json',
          CQL_FILTER: `data_hora_gmt between '${startDate}' and '${endDate}'${satelliteFilter} AND continente_id = 8`,
          srsName: 'EPSG:3857'
        }
      });
      
      // Process the data for pivot table format
      const processedData = processGeoJSON(response.data);
      setFireData(processedData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data. Using example data instead.');
      // Could use example data here as fallback
      // const exampleData = processExampleData();
      // setFireData(exampleData);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle date change
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    if (name === 'startDate') {
      setStartDate(value);
    } else if (name === 'endDate') {
      setEndDate(value);
    }
  };
  
  // Handle satellite change
  const handleSatelliteChange = (e) => {
    setSelectedSatellite(e.target.value);
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
    cols: ['pais'],
    vals: ['frp'],
    aggregatorName: 'Average',
  });
  
  const resetPivotTable = () => {
    setPivotState(getDefaultPivotSettings());
  };

  return (
    <div className="app-container">
      <h1>Focos data</h1>
      
      {error && <div className="error">{error}</div>}
      
      <div className="filter-controls">
        <div className="filter-section">
          <h3>Date Range</h3>
          <div className="date-controls">
            <div className="date-picker">
              <label htmlFor="startDate">Start Date:</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={startDate}
                onChange={handleDateChange}
                max={endDate}
              />
            </div>
            
            <div className="date-picker">
              <label htmlFor="endDate">End Date:</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={endDate}
                onChange={handleDateChange}
                min={startDate}
              />
            </div>
          </div>
        </div>
        
        <div className="filter-section">
          <h3>Satellite</h3>
          <div className="satellite-selector">
            <select 
              value={selectedSatellite} 
              onChange={handleSatelliteChange}
              className="satellite-dropdown"
            >
              {SATELLITES.map(satellite => (
                <option key={satellite.value} value={satellite.value}>
                  {satellite.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="filter-actions">
          <button onClick={fetchData} disabled={loading} className="primary-button">
            {loading ? 'Loading...' : 'Apply Filters'}
          </button>
        </div>
      </div>
      
      <div className="controls">
        <button onClick={resetPivotTable}>Reset Pivot Settings</button>
      </div>
      
      {loading ? (
        <div className="loading">Loading focos data...</div>
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