import React from 'react';

function ReportTable({ reports }) {
  if (!reports.length) return <div>No hay informes cargados.</div>;
  return (
    <table border="1" cellPadding={4} style={{ marginTop: 16, width: '100%' }}>
      <thead>
        <tr>
          <th>id</th>
          <th>created_at</th>
          <th>dx_presumptive</th>
          <th>dx_psychiatric</th>
          <th>dx_semesterly</th>
          <th>dx_annual</th>
          <th>Nombre</th>
          <th>Apellido</th>
          <th>medication</th>
        </tr>
      </thead>
      <tbody>
        {reports.map((r, i) => (
          <tr key={i}>
            <td>{r.id}</td>
            <td>{r.created_at}</td>
            <td>{r.dx_presumptive}</td>
            <td>{r.dx_psychiatric}</td>
            <td>{r.dx_semesterly}</td>
            <td>{r.dx_annual}</td>
            <td>{r.patient?.patient_name || ''}</td>
            <td>{r.patient?.patient_last_name || ''}</td>
            <td>{r.medication}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default ReportTable;
