// src/pages/SalesHistoryPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

const SalesHistoryPage = () => {
  const { id } = useParams(); // ID del tendero
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Aquí se llama al backend para traer las ventas
    // Cambia la URL por la real de tu microservicio de reportes
    fetch(`http://localhost:8000/report/sales/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setVentas(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al cargar ventas:", err);
        setVentas([]);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <p>Cargando ventas...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Historial de Ventas</h2>
      <Link to="/shopkeepers">← Volver</Link>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "1rem",
        }}
      >
        <thead style={{ background: "#f0f0f0" }}>
          <tr>
            <th style={thStyle}>ID Venta</th>
            <th style={thStyle}>Producto</th>
            <th style={thStyle}>Precio</th>
            <th style={thStyle}>Cantidad</th>
            <th style={thStyle}>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {ventas.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", padding: "2rem" }}>
                <strong>No hay ventas registradas para este tendero.</strong>
              </td>
            </tr>
          ) : (
            ventas.map((v) => (
              <tr key={v.id}>
                <td style={tdStyle}>{v.id}</td>
                <td style={tdStyle}>{v.producto}</td>
                <td style={tdStyle}>${v.precio}</td>
                <td style={tdStyle}>{v.cantidad}</td>
                <td style={tdStyle}>
                  {new Date(v.fecha).toLocaleDateString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

const thStyle = {
  border: "1px solid #ccc",
  padding: "8px",
  textAlign: "left",
};

const tdStyle = {
  border: "1px solid #ddd",
  padding: "8px",
};

export default SalesHistoryPage;