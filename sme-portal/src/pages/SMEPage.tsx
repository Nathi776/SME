import { useEffect, useState} from 'react';
import { SME, SMEApi, SMECreate } from '../api/smeApi';


function SMEPage() {
    const [smes, setSmes] = useState<SME[]>([]);
    const [form, setForm] = useState<SMECreate>({
        name: '',
        description: '',
        industry: '',
        owner_id: 1,
    });

    // Load SMEs
    useEffect(() => {
        loadSMEs();
    }, []);

    const loadSMEs = async () => {
        const res = await SMEApi.getAll();
        setSmes(res.data);
    };

    const createSME = async () => {
        await SMEApi.create(form);
        setForm({
            name: '',
            description: '',
            industry: '',
            owner_id: 1,
        });
        loadSMEs();
    };

    const deleteSME = async (id: number) => {
        await SMEApi.delete(id);
        loadSMEs();
    };

    return (
        <div>
            <h1>SME Management</h1>

            <h2 >Create SME</h2>
            <input
                type="text"
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
                type="text"
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <input
                type="text"
                placeholder="Industry"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
            />
            <button onClick={createSME}>Create SME</button>


            <h2>SME List</h2>
            {smes.map((s) => (
                <div key={s.id} style={{ border: "1px solid #ccc", margin: 8, padding: 8 }}>
                <strong>{s.name}</strong> ({s.industry})
                <p>{s.description}</p>
                <button onClick={() => deleteSME(s.id)}>Delete</button>
                </div>
            ))}
        </div>
    );
}

export default SMEPage;