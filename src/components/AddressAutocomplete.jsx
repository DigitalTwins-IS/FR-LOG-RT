/**
 * Componente de autocompletado de direcciones con Nominatim
 * HU18: Facilita registro de tenderos
 */
import React, { useState, useEffect, useRef } from 'react';
import { Form, ListGroup, Spinner, Badge, InputGroup, Button } from 'react-bootstrap';
import { useGeocoding } from '../hooks/useGeocoding';

const AddressAutocomplete = ({ 
  onSelect, 
  city = 'Bogotá', 
  placeholder = 'Buscar dirección...',
  initialValue = '',
  disabled = false 
}) => {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const debounceTimer = useRef(null);
  const { geocode, loading } = useGeocoding();

  useEffect(() => {
    if (initialValue) {
      setQuery(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    // Debounce: Esperar 1 segundo después de que el usuario deje de escribir
    if (query.length >= 3) {
      clearTimeout(debounceTimer.current);
      
      debounceTimer.current = setTimeout(() => {
        searchAddress();
      }, 1000); // ⚠️ IMPORTANTE: Respetar rate limit de 1 req/seg
    } else {
      setResults([]);
      setShowResults(false);
    }

    return () => clearTimeout(debounceTimer.current);
  }, [query]);

  const searchAddress = async () => {
    const result = await geocode(query, city);
    
    if (result) {
      setResults([result]);
      setShowResults(true);
    } else {
      setResults([]);
      setShowResults(false);
    }
  };

  const handleSelect = (result) => {
    setQuery(result.fullAddress);
    setShowResults(false);
    onSelect({
      address: query,
      latitude: result.latitude,
      longitude: result.longitude,
      full_address: result.fullAddress,
      confidence: result.confidence
    });
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    onSelect(null);
  };

  return (
    <div style={{ position: 'relative' }}>
      <Form.Group className="mb-3">
        <Form.Label>Dirección</Form.Label>
        <InputGroup>
          <Form.Control
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            disabled={disabled}
          />
          {query && (
            <Button 
              variant="outline-secondary" 
              onClick={handleClear}
              disabled={disabled}
            >
              ✕
            </Button>
          )}
          {loading && (
            <InputGroup.Text>
              <Spinner animation="border" size="sm" />
            </InputGroup.Text>
          )}
        </InputGroup>
        <Form.Text className="text-muted">
          Escribe al menos 3 caracteres. Los resultados pueden tardar ~1 segundo.
        </Form.Text>
      </Form.Group>

      {showResults && results.length > 0 && (
        <ListGroup style={{
          position: 'absolute',
          zIndex: 1000,
          width: '100%',
          maxHeight: '300px',
          overflowY: 'auto',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {results.map((result, idx) => (
            <ListGroup.Item
              key={idx}
              action
              onClick={() => handleSelect(result)}
              style={{ cursor: 'pointer' }}
            >
              <div>
                <strong>📍 {query}</strong>
                <br />
                <small className="text-muted">{result.fullAddress}</small>
                <br />
                <Badge 
                  bg={result.confidence > 0.7 ? 'success' : result.confidence > 0.5 ? 'warning' : 'secondary'} 
                  className="mt-1"
                >
                  Confianza: {(result.confidence * 100).toFixed(0)}%
                </Badge>
                {result.fromCache && (
                  <Badge bg="info" className="mt-1 ms-2">
                    📦 Caché
                  </Badge>
                )}
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </div>
  );
};

export default AddressAutocomplete;