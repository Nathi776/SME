import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { useSnackbar } from 'notistack';
import { logout as doLogout } from '../utils/auth';
import { SME, SMEApi, SMECreate } from '../api/smeApi';


function SMEPage() {
    const [smes, setSmes] = useState<SME[]>([]);
    const [form, setForm] = useState<SMECreate>({
        name: '',
        industry: '',
        revenue: 0,
    });
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

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
            industry: '',
            revenue: 0,
        });
        loadSMEs();
    };

    const deleteSME = async (id: number) => {
        await SMEApi.delete(id);
        loadSMEs();
    };

    const handleLogout = () => {
        enqueueSnackbar('Logged out', { variant: 'info' });
        doLogout();
    };

    return (
        <Box sx={{ minHeight: "100vh", py: 4 }}>
            <Container maxWidth="lg">
                <Stack spacing={3}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 800 }}>SME Management</Typography>
                            <Typography color="text.secondary">Create, review, and manage SME records.</Typography>
                        </Box>
                        <Button variant="outlined" onClick={handleLogout}>Logout</Button>
                    </Box>

                    <Card>
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                                Create SME
                            </Typography>
                            <Stack spacing={2}>
                                <TextField
                                    label="Name"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    fullWidth
                                />
                                <TextField
                                    label="Description"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    fullWidth
                                />
                                <TextField
                                    label="Industry"
                                    value={form.industry}
                                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                                    fullWidth
                                />
                                <TextField
                                    label="Revenue"
                                    type="number"
                                    value={form.revenue}
                                    onChange={(e) => setForm({ ...form, revenue: Number(e.target.value) })}
                                    fullWidth
                                />
                                <Box>
                                    <Button variant="contained" onClick={createSME}>Create SME</Button>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>

                    <Box>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                            SME List
                        </Typography>
                        <Stack spacing={2}>
                            {smes.map((s) => (
                                <Card key={s.id} variant="outlined">
                                    <CardContent>
                                        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
                                            <Box>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                                    {s.name}
                                                </Typography>
                                                <Typography color="text.secondary">
                                                    {s.industry}
                                                </Typography>
                                                <Typography sx={{ mt: 1 }}>
                                                    Revenue: {s.revenue}
                                                </Typography>
                                            </Box>
                                            <Button color="error" variant="outlined" onClick={() => deleteSME(s.id)}>
                                                Delete
                                            </Button>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    </Box>
                </Stack>
            </Container>
        </Box>
    );
}

export default SMEPage;