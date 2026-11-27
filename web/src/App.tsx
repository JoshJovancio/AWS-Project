import { useEffect, useState, FormEvent } from 'react';

interface Equipment {
  equipmentId: string;
  equipmentName: string;
  category: string;
  brand: string;
  availability: 'AVAILABLE' | 'BORROWED' | 'MAINTENANCE' | 'DAMAGED';
  borrowerName?: string | null;
  borrowerId?: string | null;
}

export default function App() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [health, setHealth] = useState<string>('Checking...');
  const [form, setForm] = useState({ equipmentId: '', equipmentName: '', category: '', brand: '' });

  const loadData = async () => {
    try {
      const h = await fetch('/health').then((r) => r.json());
      setHealth(h.status === 'ok' ? 'API & RDS Connected' : 'DB Error');
      const data = await fetch('/equipment').then((r) => r.json());
      if (Array.isArray(data)) setItems(data);
    } catch {
      setHealth('API Unreachable');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    await fetch('/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ equipmentId: '', equipmentName: '', category: '', brand: '' });
    loadData();
  };

  const handleToggleBorrow = async (item: Equipment) => {
    const nextStatus = item.availability === 'AVAILABLE' ? 'BORROWED' : 'AVAILABLE';
    await fetch(`/equipment/${item.equipmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        nextStatus === 'BORROWED'
          ? { availability: 'BORROWED', borrowerName: 'Admin Assigned', borrowerId: 'STAFF-01' }
          : { availability: 'AVAILABLE' }
      ),
    });
    loadData();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/equipment/${id}`, { method: 'DELETE' });
    loadData();
  };

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 860, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>University Equipment Management</h1>
      <p>
        <strong>System Status:</strong> {health}
      </p>

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        <input placeholder="ID (e.g. EQ-001)" required value={form.equipmentId} onChange={(e) => setForm({ ...form, equipmentId: e.target.value })} />
        <input placeholder="Name" required value={form.equipmentName} onChange={(e) => setForm({ ...form, equipmentName: e.target.value })} />
        <input placeholder="Category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input placeholder="Brand" required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
        <button type="submit">Add Equipment</button>
      </form>

      <table border={1} cellPadding={8} style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Category</th>
            <th>Brand</th>
            <th>Status</th>
            <th>Borrower</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.equipmentId}>
              <td>{item.equipmentId}</td>
              <td>{item.equipmentName}</td>
              <td>{item.category}</td>
              <td>{item.brand}</td>
              <td>{item.availability}</td>
              <td>{item.borrowerName || '-'}</td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => handleToggleBorrow(item)}>
                  {item.availability === 'AVAILABLE' ? 'Borrow' : 'Return'}
                </button>
                <button onClick={() => handleDelete(item.equipmentId)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}