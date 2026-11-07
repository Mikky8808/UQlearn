import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiConfig';

export const CertificateVerificationPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
      setError('Certificate ID is missing.');
      setLoading(false);
      return;
    }

    apiFetch(`certificates.php?action=verify&id=${encodeURIComponent(id)}`, { silent: true })
      .then(res => {
        if (res && res.success) {
          setData(res.data);
        } else {
          setError(res?.message || 'Certificate not found or invalid.');
        }
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to verify certificate.');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center">Verifying...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto bg-white rounded-lg shadow mt-10">
      <h1 className="text-2xl font-bold mb-4">Certificate Verified</h1>
      <div className="space-y-2 mb-6">
        <p><strong>Student:</strong> {data.studentName}</p>
        <p><strong>Course:</strong> {data.courseName}</p>
        <p><strong>Issued:</strong> {data.issuedAt}</p>
      </div>
      <a href="/" className="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Go Home</a>
    </div>
  );
};
