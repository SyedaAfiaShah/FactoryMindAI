import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  FileText,
  CheckCircle2,
  Database,
  Trash2,
  ChevronRight,
  Info,
  Users,
  Smartphone,
  Mail,
  Cpu,
  Eye,
  UploadCloud,
  FileCheck,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import Papa from 'papaparse';
import type { Scenario, ScenarioResults } from './types';

// API Configuration
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/v1';

// Preset Scenarios matching mobile app
const PRESETS = [
  {
    id: 'overstrain_failure',
    label: 'Scenario 1: Overstrain Escalation',
    machine: 'Machine 1',
    name: 'Machine 1 Overstrain Escalation',
    description: 'Torque is climbing while spindle speed drops on Machine 1 during heavy production load.',
    operatorNotes: 'Machine 1 is vibrating under load and operators report harder cutting resistance on the current shift.',
    supplierEmail: 'Spare spindle coupling delivery is delayed by 48 hours, so immediate replacement stock is limited.',
    newsUpdates: 'Power demand on the industrial estate is elevated this week, increasing stress during peak production windows.',
    sensors: [
      { UDI: '1', 'Product ID': 'M14860', Type: 'M', 'Air temperature [K]': '298.1', 'Process temperature [K]': '308.6', 'Rotational speed [rpm]': '1551', 'Torque [Nm]': '42.8', 'Tool wear [min]': '0', Target: '0' },
      { UDI: '2', 'Product ID': 'M14861', Type: 'M', 'Air temperature [K]': '298.2', 'Process temperature [K]': '308.7', 'Rotational speed [rpm]': '1408', 'Torque [Nm]': '46.3', 'Tool wear [min]': '3', Target: '0' },
      { UDI: '3', 'Product ID': 'M14862', Type: 'M', 'Air temperature [K]': '298.1', 'Process temperature [K]': '308.5', 'Rotational speed [rpm]': '1310', 'Torque [Nm]': '55.1', 'Tool wear [min]': '5', Target: '0' },
      { UDI: '4', 'Product ID': 'M14863', Type: 'M', 'Air temperature [K]': '298.2', 'Process temperature [K]': '308.6', 'Rotational speed [rpm]': '1205', 'Torque [Nm]': '68.4', 'Tool wear [min]': '8', Target: '0' },
      { UDI: '5', 'Product ID': 'M14864', Type: 'M', 'Air temperature [K]': '298.2', 'Process temperature [K]': '308.7', 'Rotational speed [rpm]': '1110', 'Torque [Nm]': '85.2', 'Tool wear [min]': '12', Target: '1' }
    ]
  },
  {
    id: 'heat_dissipation_failure',
    label: 'Scenario 2: Heat Dissipation',
    machine: 'Machine 2',
    name: 'Machine 2 Cooling Failure Warning',
    description: 'Machine 2 shows rising process temperature relative to ambient conditions, indicating cooling inefficiency.',
    operatorNotes: 'Maintenance crew observed slower coolant circulation near Machine 2 and intermittent hot surface alarms.',
    supplierEmail: 'Coolant pump vendor confirmed service engineer availability only from the next morning shift.',
    newsUpdates: 'Regional heat conditions are above seasonal baseline, which can amplify thermal failures on older machines.',
    sensors: [
      { UDI: '11', 'Product ID': 'L47180', Type: 'L', 'Air temperature [K]': '300.1', 'Process temperature [K]': '310.2', 'Rotational speed [rpm]': '1450', 'Torque [Nm]': '38.2', 'Tool wear [min]': '15', Target: '0' },
      { UDI: '12', 'Product ID': 'L47181', Type: 'L', 'Air temperature [K]': '301.2', 'Process temperature [K]': '312.4', 'Rotational speed [rpm]': '1462', 'Torque [Nm]': '37.8', 'Tool wear [min]': '18', Target: '0' },
      { UDI: '13', 'Product ID': 'L47182', Type: 'L', 'Air temperature [K]': '302.5', 'Process temperature [K]': '314.9', 'Rotational speed [rpm]': '1448', 'Torque [Nm]': '39.0', 'Tool wear [min]': '20', Target: '0' },
      { UDI: '14', 'Product ID': 'L47183', Type: 'L', 'Air temperature [K]': '303.8', 'Process temperature [K]': '317.5', 'Rotational speed [rpm]': '1451', 'Torque [Nm]': '38.5', 'Tool wear [min]': '24', Target: '0' },
      { UDI: '15', 'Product ID': 'L47184', Type: 'L', 'Air temperature [K]': '304.2', 'Process temperature [K]': '319.8', 'Rotational speed [rpm]': '1439', 'Torque [Nm]': '41.2', 'Tool wear [min]': '28', Target: '1' }
    ]
  },
  {
    id: 'tool_wear_failure',
    label: 'Scenario 3: Tool Wear Breakdown',
    machine: 'Machine 3',
    name: 'Machine 3 Tool Wear Breakdown Risk',
    description: 'Machine 3 is approaching end-of-life tool wear, with worsening torque stability and quality drift.',
    operatorNotes: 'Finished parts from Machine 3 show rough edges and operators hear a repeating chatter near the cutting head.',
    supplierEmail: 'Replacement tool inserts are available, but the preferred grade is constrained until the next dispatch cycle.',
    newsUpdates: 'Commodity price movement is raising replacement tooling cost, so downtime decisions need tighter prioritization.',
    sensors: [
      { UDI: '21', 'Product ID': 'H29410', Type: 'H', 'Air temperature [K]': '297.5', 'Process temperature [K]': '307.2', 'Rotational speed [rpm]': '1600', 'Torque [Nm]': '32.1', 'Tool wear [min]': '190', Target: '0' },
      { UDI: '22', 'Product ID': 'H29411', Type: 'H', 'Air temperature [K]': '297.6', 'Process temperature [K]': '307.3', 'Rotational speed [rpm]': '1585', 'Torque [Nm]': '33.8', 'Tool wear [min]': '205', Target: '0' },
      { UDI: '23', 'Product ID': 'H29412', Type: 'H', 'Air temperature [K]': '297.5', 'Process temperature [K]': '307.4', 'Rotational speed [rpm]': '1612', 'Torque [Nm]': '31.5', 'Tool wear [min]': '220', Target: '0' },
      { UDI: '24', 'Product ID': 'H29413', Type: 'H', 'Air temperature [K]': '297.6', 'Process temperature [K]': '307.5', 'Rotational speed [rpm]': '1554', 'Torque [Nm]': '38.4', 'Tool wear [min]': '235', Target: '0' },
      { UDI: '25', 'Product ID': 'H29414', Type: 'H', 'Air temperature [K]': '297.7', 'Process temperature [K]': '307.6', 'Rotational speed [rpm]': '1410', 'Torque [Nm]': '48.9', 'Tool wear [min]': '250', Target: '1' }
    ]
  }
];

export default function App() {
  // Session / Authentication state
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('factorymind_token');
    } catch (e) {
      return null;
    }
  });
  const [user, setUser] = useState<any>(() => {
    try {
      const u = localStorage.getItem('factorymind_user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  });
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('operator');
  const [authError, setAuthError] = useState('');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(true);

  // Global Scenarios state
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [results, setResults] = useState<ScenarioResults | null>(null);
  const [loadingScenarios, setLoadingScenarios] = useState(false);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'command' | 'ingest' | 'contradiction' | 'planner' | 'simulation'>('command');

  // Creation Wizard states
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [machineId, setMachineId] = useState('Machine 1');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('overstrain_failure');
  const [operatorNotes, setOperatorNotes] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [newsUpdates, setNewsUpdates] = useState('');
  const [customCsvData, setCustomCsvData] = useState<any[] | null>(null);
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Agent Pipeline state
  const [analysisStatus, setAnalysisStatus] = useState<string>('idle'); // idle, analyzing, complete, error
  const [currentAgentIndex, setCurrentAgentIndex] = useState<number>(-1);
  const [agentProgress, setAgentProgress] = useState<number>(0);
  const [agentLogs, setAgentLogs] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState('');

  // Local Alerts state
  const [alerts, setAlerts] = useState<any[]>([
    { id: '1', category: 'machine_health', severity: 'critical', title: 'Machine 1 Temperature Spike', desc: 'Process temp rose to 308.7K on sensor rail.', time: '2 mins ago' },
    { id: '2', category: 'ops', severity: 'high', title: 'Coupling Delivery Delayed', desc: 'Supplier reports shipment delay for spare components.', time: '10 mins ago' },
    { id: '3', category: 'supply_chain', severity: 'medium', title: 'Inventory Reorder Triggered', desc: 'Machine 3 parts drop below safety threshold.', time: '1 hour ago' }
  ]);

  // Terminal reference for autoscroll
  const terminalRefs = useRef<Record<string, HTMLPreElement | null>>({});

  // 1. Authenticated Headers utility
  const getHeaders = (): Record<string, string> => {
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Fetch Scenarios from API
  const fetchScenarios = async () => {
    if (isOfflineMode) {
      setIsBackendConnected(true);
      // Mock historical list
      setScenarios([
        {
          id: 'preset-demo-id-1',
          name: 'Machine 1 Overstrain Escalation',
          description: 'Torque is climbing while spindle speed drops on Machine 1 during heavy production load.',
          status: 'complete',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          updated_at: new Date(Date.now() - 3400000).toISOString()
        },
        {
          id: 'preset-demo-id-2',
          name: 'Machine 2 Cooling Failure Warning',
          description: 'Machine 2 shows rising process temperature relative to ambient conditions.',
          status: 'complete',
          created_at: new Date(Date.now() - 7200000).toISOString(),
          updated_at: new Date(Date.now() - 7000000).toISOString()
        }
      ]);
      return;
    }

    setLoadingScenarios(true);
    try {
      const res = await fetch(`${API_BASE}/scenarios`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const rawList = data.data !== undefined ? data.data : data;
        setScenarios(Array.isArray(rawList) ? rawList : []);
        setIsBackendConnected(true);
      } else if (res.status === 401) {
        handleLogout();
      } else {
        setIsBackendConnected(false);
      }
    } catch (err) {
      console.error('Failed to fetch scenarios', err);
      setIsBackendConnected(false);
    } finally {
      setLoadingScenarios(false);
    }
  };

  const fetchScenarioResults = async (scenarioId: string) => {
    try {
      if (isOfflineMode) {
        // Build mock results based on the matching preset or active inputs
        const matched = PRESETS.find(p => p.name.includes('Machine 1') || p.id === 'overstrain_failure') || PRESETS[0];
        const mockRes = generateMockScenarioResults(scenarioId, matched.name, matched.description, matched.machine, matched.operatorNotes, matched.supplierEmail, matched.newsUpdates);
        setResults(mockRes);
        setAnalysisStatus('complete');
        return;
      }

      const res = await fetch(`${API_BASE}/scenarios/${scenarioId}/results`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const resultsPayload = data.data !== undefined ? data.data : data;
        if (resultsPayload && resultsPayload.final_results) {
          const unpacked = {
            ...resultsPayload,
            ...resultsPayload.final_results
          };
          setResults(unpacked);
        } else {
          setResults(resultsPayload);
        }
        setAnalysisStatus(resultsPayload?.status || 'complete');
      }
    } catch (err) {
      console.error('Failed to fetch scenario results', err);
    } finally {
      // Done fetching
    }
  };

  // Handle Authentication submit
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'login' ? 'login' : 'signup';
    const payload = authMode === 'login'
      ? { username, password }
      : { username, password, role };

    try {
      const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        const actualData = data.data !== undefined ? data.data : data;
        const resToken = actualData.token;
        const resUser = actualData.session?.user || actualData.user;

        localStorage.setItem('factorymind_token', resToken);
        localStorage.setItem('factorymind_user', JSON.stringify(resUser));
        setToken(resToken);
        setUser(resUser);
      } else {
        setAuthError(data.detail?.detail || data.detail || 'Authentication failed');
      }
    } catch (err) {
      setAuthError('Connection refused by the backend. Ensure FastAPI server is running on localhost:8000');
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('factorymind_token');
    localStorage.removeItem('factorymind_user');
    setToken(null);
    setUser(null);
    setIsOfflineMode(false);
  };

  // Trigger offline mode for demo evaluation
  const handleOfflineAccess = () => {
    setIsOfflineMode(true);
    setToken('mock-demo-token');
    setUser({ id: 'demo-user', username: 'local-operator', role: 'manager' });
  };

  // Preset Selection helper
  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) {
      setSelectedPresetId(presetId);
      setName(preset.name);
      setDescription(preset.description);
      setMachineId(preset.machine);
      setOperatorNotes(preset.operatorNotes);
      setSupplierEmail(preset.supplierEmail);
      setNewsUpdates(preset.newsUpdates);
      setCustomCsvData(preset.sensors);
      setCsvFileName(`${preset.id}_telemetry_stream.csv`);
    }
  };

  // File Drag-Drop handler
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processCsvFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processCsvFile(files[0]);
    }
  };

  const processCsvFile = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert('Invalid file format. Please upload a CSV file.');
      return;
    }
    setCsvFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCustomCsvData(results.data);
      },
      error: (err) => {
        alert(`Error parsing CSV: ${err.message}`);
      }
    });
  };

  // Trigger analysis pipeline
  const handleSubmitScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setErrorMessage('');
    let createdScenarioId = '';

    try {
      if (isOfflineMode) {
        // Simulate Offline creation
        createdScenarioId = `mock-scen-${Date.now()}`;
        const newScen: Scenario = {
          id: createdScenarioId,
          name,
          description,
          status: 'analyzing',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setScenarios(prev => [newScen, ...prev]);
        setSelectedScenarioId(createdScenarioId);
        setIsCreating(false);
        setIsSubmitting(false);
        
        // Trigger simulated agent run
        triggerSimulatedPipeline(createdScenarioId, name, description, machineId, operatorNotes, supplierEmail, newsUpdates);
        return;
      }

      // 1. Create Scenario
      const scenRes = await fetch(`${API_BASE}/scenarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders()
        },
        body: JSON.stringify({ name, description })
      });
      if (!scenRes.ok) throw new Error('Failed to create scenario record');
      const scenData = await scenRes.json();
      const scenario: Scenario = scenData.data !== undefined ? scenData.data : scenData;
      createdScenarioId = scenario.id;

      // 2. Upload Operator Notes
      if (operatorNotes.trim()) {
        await fetch(`${API_BASE}/scenarios/${createdScenarioId}/ingest/text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getHeaders() },
          body: JSON.stringify({ type: 'operator_note', content: operatorNotes })
        });
      }

      // 3. Upload Supplier Email
      if (supplierEmail.trim()) {
        await fetch(`${API_BASE}/scenarios/${createdScenarioId}/ingest/text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getHeaders() },
          body: JSON.stringify({ type: 'email', content: supplierEmail })
        });
      }

      // 4. Upload News
      if (newsUpdates.trim()) {
        await fetch(`${API_BASE}/scenarios/${createdScenarioId}/ingest/text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getHeaders() },
          body: JSON.stringify({ type: 'news', content: newsUpdates })
        });
      }

      // 5. Ingest Telemetry data
      if (customCsvData) {
        // Upload custom CSV
        const csvText = Papa.unparse(customCsvData);
        const blob = new Blob([csvText], { type: 'text/csv' });
        const formData = new FormData();
        formData.append('file', blob, csvFileName || 'telemetry.csv');

        const uploadRes = await fetch(`${API_BASE}/scenarios/${createdScenarioId}/ingest/sensor`, {
          method: 'POST',
          headers: getHeaders(),
          body: formData
        });
        if (!uploadRes.ok) throw new Error('CSV upload failed');
      } else {
        // Call ingest preset default sensor dataset
        const presetRes = await fetch(`${API_BASE}/scenarios/${createdScenarioId}/ingest/sensor/default`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getHeaders() },
          body: JSON.stringify({
            machine_id: machineId,
            scenario_type: selectedPresetId,
            dataset_source: 'ai4i',
            sample_size: 15
          })
        });
        if (!presetRes.ok) throw new Error('Loading preset telemetry dataset failed');
      }

      // 6. Trigger pipeline analysis
      const runRes = await fetch(`${API_BASE}/scenarios/${createdScenarioId}/analyze`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (!runRes.ok) throw new Error('Starting agent pipeline failed');

      // Update Local list
      await fetchScenarios();
      setSelectedScenarioId(createdScenarioId);
      setIsCreating(false);
      setIsSubmitting(false);

      // Start live API polling and rendering
      runLivePipelinePolling(createdScenarioId);

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Workflow pipeline execution error');
      setIsSubmitting(false);
    }
  };

  // Live backend status polling
  const runLivePipelinePolling = (scenarioId: string) => {
    setAnalysisStatus('analyzing');
    setCurrentAgentIndex(0);
    setAgentProgress(15);
    
    // Seed initial thinking logs
    setAgentLogs({
      'machine_health': ['[SYSTEM] Loading parsed sensor CSV rows...', '[HEALTH] Model loading config...'],
      'contradiction_detection': ['[SYSTEM] Waiting for Machine Health agent outputs...'],
      'demand_forecast': ['[SYSTEM] Idle.'],
      'action_planning': ['[SYSTEM] Idle.'],
      'simulation': ['[SYSTEM] Idle.']
    });

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 250) {
        clearInterval(interval);
        setAnalysisStatus('error');
        setErrorMessage('Analysis pipeline request timed out.');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/scenarios/${scenarioId}/status`, {
          headers: getHeaders()
        });
        if (res.ok) {
          const statusData = await res.json();
          const status = statusData.status || 'analyzing';

          // Simulate detailed UI logs mapping agents
          if (status === 'analyzing') {
            updateLivePollingLogs(attempts);
          } else if (status === 'complete') {
            clearInterval(interval);
            setAgentProgress(100);
            setCurrentAgentIndex(5);
            // Fetch final outcomes
            await fetchScenarioResults(scenarioId);
            await fetchScenarios();
            
            // Add a new alert to list
            setAlerts(prev => [
              {
                id: Date.now().toString(),
                category: 'machine_health',
                severity: 'critical',
                title: `${machineId} Anomaly Resolved`,
                desc: 'AI orchestration planning successfully dispatched recovery commands.',
                time: 'Just now'
              },
              ...prev
            ]);
          } else if (status === 'error') {
            clearInterval(interval);
            setAnalysisStatus('error');
            setErrorMessage(statusData.error_message || 'Multi-Agent pipeline failed.');
          }
        }
      } catch (err) {
        console.error(err);
      }
    }, 1200);
  };

  const updateLivePollingLogs = (stepCount: number) => {
    // Progress increment details based on time
    if (stepCount <= 3) {
      setCurrentAgentIndex(0); // Health
      setAgentProgress(Math.min(10 + stepCount * 8, 30));
      setAgentLogs(prev => ({
        ...prev,
        'machine_health': [
          ...(prev['machine_health'] || []),
          `[HEALTH] Evaluating risk factor vector at step ${stepCount}...`,
          `[HEALTH] Calculated sensor deviation metrics: RPM vs Torque scaling abnormal.`
        ]
      }));
    } else if (stepCount <= 6) {
      setCurrentAgentIndex(1); // Contradiction
      setAgentProgress(Math.min(30 + (stepCount - 3) * 10, 55));
      setAgentLogs(prev => ({
        ...prev,
        'machine_health': [...(prev['machine_health'] || []), '[HEALTH] Task complete. Saved trace to cloud.'],
        'contradiction_detection': [
          ...(prev['contradiction_detection'] || []),
          `[CONTRADICTION] Loaded shift logs and operator comments...`,
          `[CONTRADICTION] Discrepancy checked. Operator claims nominal but sensor telemetry shows failure risk!`
        ]
      }));
    } else if (stepCount <= 9) {
      setCurrentAgentIndex(2); // Demand
      setAgentProgress(Math.min(55 + (stepCount - 6) * 7, 74));
      setAgentLogs(prev => ({
        ...prev,
        'contradiction_detection': [...(prev['contradiction_detection'] || []), '[CONTRADICTION] Contradiction evaluated. Prioritizing physical telemetry.'],
        'demand_forecast': [
          ...(prev['demand_forecast'] || []),
          `[DEMAND] Matching production orders against Machine downtime projections...`,
          `[DEMAND] Projecting 48-hour delivery delay of spare parts. Outage will impact order batch B482.`
        ]
      }));
    } else if (stepCount <= 15) {
      setCurrentAgentIndex(3); // Action Planner
      setAgentProgress(Math.min(74 + (stepCount - 10) * 2, 84));
      const plannerMsgs = [
        `[PLANNER] Initializing action planning module...`,
        `[PLANNER] Loading machine health risk profile and contradiction flags...`,
        `[PLANNER] Computing optimal intervention sequence...`,
        `[PLANNER] Action P1: Lower load on ${machineId}. Action P2: Shift jobs to backup line.`,
        `[PLANNER] Estimating effort hours and cost. Checking part availability...`,
        `[PLANNER] Action plan finalized with ${stepCount - 9} validated actions.`
      ];
      setAgentLogs(prev => ({
        ...prev,
        'demand_forecast': [...(prev['demand_forecast'] || []), '[DEMAND] Outage impact quantified. Handoff to Action Planner.'],
        'action_planning': [
          ...(prev['action_planning'] || []),
          plannerMsgs[Math.min(stepCount - 10, plannerMsgs.length - 1)]
        ]
      }));
    } else {
      setCurrentAgentIndex(4); // Simulation Agent
      setAgentProgress(Math.min(84 + (stepCount - 16) * 2, 96));
      const simMsgs = [
        `[SIMULATION] Booting digital twin physics engine...`,
        `[SIMULATION] Applying load-dampening vectors to twin state model...`,
        `[SIMULATION] Projecting 48-hour telemetry recovery trajectory...`,
        `[SIMULATION] Before/After risk delta computed: -48 pts. OEE stabilized to 88%.`,
        `[SIMULATION] Generating stakeholder notification dispatch payloads...`,
        `[SIMULATION] Dispatched email to Maintenance Manager. SMS sent to Shift Supervisor.`,
        `[SIMULATION] Twin sync complete. All outputs archived to cloud trace log.`
      ];
      setAgentLogs(prev => ({
        ...prev,
        'action_planning': [...(prev['action_planning'] || []), '[PLANNER] Action planning complete. Handing off to Simulator.'],
        'simulation': [
          ...(prev['simulation'] || []),
          simMsgs[Math.min(stepCount - 16, simMsgs.length - 1)]
        ]
      }));
    }
  };

  // Simulated Offline Agent run
  const triggerSimulatedPipeline = (
    scenarioId: string,
    scenName: string,
    scenDesc: string,
    machId: string,
    notes: string,
    email: string,
    news: string
  ) => {
    setAnalysisStatus('analyzing');
    setCurrentAgentIndex(0);
    setAgentProgress(5);
    setAgentLogs({
      'machine_health': ['[SYSTEM] Booting simulated environment...', '[SYSTEM] Parsing sensor CSV telemetry...'],
      'contradiction_detection': ['[SYSTEM] Standing by for agent 1 results...'],
      'demand_forecast': ['[SYSTEM] Standing by...'],
      'action_planning': ['[SYSTEM] Standing by...'],
      'simulation': ['[SYSTEM] Standing by...']
    });

    const pipelineSteps = [
      {
        agent: 'machine_health',
        index: 0,
        logs: [
          '[HEALTH] Connecting to Vertex AI telemetry classification models...',
          '[HEALTH] Analyzing rotational speed [rpm] & torque [Nm] coefficients...',
          `[HEALTH] Machine: ${machId}. Detected failure signature.`,
          '[HEALTH] ML model failure probability calculated: 82%',
          '[HEALTH] Risk assessment updated: CRITICAL state.'
        ],
        progress: 25
      },
      {
        agent: 'contradiction_detection',
        index: 1,
        logs: [
          '[CONTRADICTION] Reading unstructured narrative inputs...',
          `[CONTRADICTION] Loaded shift report: "${notes.substring(0, 50)}..."`,
          '[CONTRADICTION] Cross-referencing logs with numerical telemetry...',
          '[CONTRADICTION] CONTRADICTION DETECTED: Operator reports smooth running, but sensor logs indicate imminent overstrain.',
          '[CONTRADICTION] Timestamp trust rating: Physical sensor data prioritized (92% confidence).'
        ],
        progress: 45
      },
      {
        agent: 'demand_forecast',
        index: 2,
        logs: [
          '[DEMAND] Fetching current warehouse parts inventory...',
          `[DEMAND] Analyzing vendor warning email: "${email.substring(0, 50)}..."`,
          '[DEMAND] Processing supply chain constraints. Spindle parts delayed 48 hours.',
          '[DEMAND] Target impact warning: Order fulfillment threshold threatened by 14% efficiency drop.'
        ],
        progress: 68
      },
      {
        agent: 'action_planning',
        index: 3,
        logs: [
          '[PLANNER] Generating prioritized physical mitigation checklist...',
          `[PLANNER] Action 1: Isolate spindle head and lower feedrate on ${machId}.`,
          '[PLANNER] Action 2: Route urgent backlog production queue to alternate Factory Line.',
          '[PLANNER] Estimating labor hours: 2.0 hours. Spare parts cost: $900.'
        ],
        progress: 85
      },
      {
        agent: 'simulation',
        index: 4,
        logs: [
          '[SIMULATION] Booting digital twin physics simulations...',
          '[SIMULATION] Applying load dampening and alternate routing vectors...',
          '[SIMULATION] Target state projection: OEE stabilized at 88%. Risk index reduced to 16%.',
          '[SIMULATION] Dispatched email warnings to factory director & maintenance dispatch.',
          '[SYSTEM] Pipeline completion verification successful.'
        ],
        progress: 100
      }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < pipelineSteps.length) {
        const step = pipelineSteps[currentStep];
        setCurrentAgentIndex(step.index);
        setAgentProgress(step.progress);
        
        // Append logs
        setAgentLogs(prev => {
          const updated = { ...prev };
          updated[step.agent] = [...(updated[step.agent] || []), ...step.logs];
          return updated;
        });
        
        currentStep++;
      } else {
        clearInterval(interval);
        setCurrentAgentIndex(5);
        
        // Finish simulation
        setAnalysisStatus('complete');
        const mockResults = generateMockScenarioResults(scenarioId, scenName, scenDesc, machId, notes, email, news);
        setResults(mockResults);
        
        // Update scenarios list status
        setScenarios(prev => prev.map(s => s.id === scenarioId ? { ...s, status: 'complete' } : s));
      }
    }, 1200);
  };

  // Helper to delete a scenario
  const handleDeleteScenario = async (scenarioId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this scenario and all associated agent telemetry?')) return;

    try {
      if (isOfflineMode) {
        setScenarios(prev => prev.filter(s => s.id !== scenarioId));
        if (selectedScenarioId === scenarioId) {
          setSelectedScenarioId(null);
          setResults(null);
        }
        return;
      }

      const res = await fetch(`${API_BASE}/scenarios/${scenarioId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        fetchScenarios();
        if (selectedScenarioId === scenarioId) {
          setSelectedScenarioId(null);
          setResults(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Autoscroll terminals when agent log changes
  useEffect(() => {
    Object.keys(agentLogs).forEach(agent => {
      const el = terminalRefs.current[agent];
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }, [agentLogs]);

  // Initial fetch of scenarios when token changes
  useEffect(() => {
    if (token) {
      fetchScenarios();
    }
  }, [token, isOfflineMode]);

  // Load results when selected scenario changes
  useEffect(() => {
    if (selectedScenarioId) {
      fetchScenarioResults(selectedScenarioId);
    }
  }, [selectedScenarioId]);

  // Apply default preset on load when creation form is opened
  useEffect(() => {
    if (isCreating) {
      applyPreset('overstrain_failure');
    }
  }, [isCreating]);

  // Simple authentication layout if not logged in
  if (!token) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--background)',
        fontFamily: 'var(--font-sans)',
        padding: '24px',
        backgroundImage: 'radial-gradient(circle, var(--outline-variant) 0.5px, transparent 0.5px)',
        backgroundSize: '24px 24px'
      }}>
        <div style={{
          backgroundColor: 'var(--surface-container-lowest)',
          border: '1px solid var(--outline-variant)',
          borderRadius: 'var(--radius-sm)',
          padding: '36px 32px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 8px 32px rgba(4, 22, 39, 0.08)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '2px',
              backgroundColor: 'var(--primary)',
              color: 'var(--on-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '20px',
              margin: '0 auto 14px auto',
              letterSpacing: '-0.02em'
            }}>FM</div>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              FactoryMind AI — Command Center
            </h2>
            <p style={{ fontSize: '11px', color: 'var(--outline)', marginTop: '4px', fontWeight: 500 }}>
              Autonomous Industrial Intelligence &amp; SmartFactory OS
            </p>
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="Enter operator username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                required
                placeholder="Enter access code"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {authMode === 'signup' && (
              <div className="form-group">
                <label className="form-label">Assigned Role</label>
                <select
                  className="form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="operator">Shift Operator</option>
                  <option value="maintenance">Maintenance Engineer</option>
                  <option value="manager">Operations Manager</option>
                </select>
              </div>
            )}

            {authError && (
              <div style={{
                fontSize: '11px',
                color: 'var(--error)',
                backgroundColor: 'rgba(186, 26, 26, 0.06)',
                padding: '8px 12px',
                borderLeft: '3px solid var(--error)',
                lineHeight: '1.5'
              }}>
                {authError}
              </div>
            )}

            <button type="submit" className="btn-primary" style={{
              justifyContent: 'center',
              padding: '10px',
              fontSize: '12px',
              marginTop: '6px',
              borderRadius: 'var(--radius-sm)'
            }}>
              {authMode === 'login' ? 'Authenticate Access' : 'Register Operator Profile'}
            </button>
          </form>

          <div style={{ marginTop: '18px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--secondary)',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 700,
                textDecoration: 'underline',
                letterSpacing: '0.02em'
              }}
            >
              {authMode === 'login' ? 'Create new operator account' : 'Return to login panel'}
            </button>

            <div style={{ height: '1px', backgroundColor: 'var(--outline-variant)', margin: '4px 0' }} />

            <button
              onClick={handleOfflineAccess}
              style={{
                backgroundColor: 'var(--surface-container)',
                border: '1px solid var(--outline-variant)',
                color: 'var(--on-surface-variant)',
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                transition: 'var(--transition-fast)'
              }}
            >
              Access Local Offline Sandbox
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* 1. Left Navigation Rail */}
      <nav className="nav-rail">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', flex: 1 }}>
          <div className="logo-container">
            <div className="logo-icon">FM</div>
          </div>

          <div className="nav-buttons">
            <button
              className={`nav-btn ${activeTab === 'command' ? 'active' : ''}`}
              onClick={() => setActiveTab('command')}
              title="Scenario Center"
            >
              <span className="material-symbols-outlined">dashboard</span>
              <span className="nav-tooltip">Scenario Center</span>
            </button>

            <button
              className={`nav-btn ${activeTab === 'ingest' ? 'active' : ''}`}
              onClick={() => setActiveTab('ingest')}
              disabled={!selectedScenarioId}
              style={{ opacity: selectedScenarioId ? 1 : 0.35 }}
              title="Telemetry Ingest"
            >
              <span className="material-symbols-outlined">analytics</span>
              <span className="nav-tooltip">Telemetry &amp; Ingest</span>
            </button>

            <button
              className={`nav-btn ${activeTab === 'contradiction' ? 'active' : ''}`}
              onClick={() => setActiveTab('contradiction')}
              disabled={!selectedScenarioId || !results}
              style={{ opacity: selectedScenarioId && results ? 1 : 0.35 }}
              title="Contradictions"
            >
              <span className="material-symbols-outlined">error_outline</span>
              <span className="nav-tooltip">Contradictions</span>
            </button>

            <button
              className={`nav-btn ${activeTab === 'planner' ? 'active' : ''}`}
              onClick={() => setActiveTab('planner')}
              disabled={!selectedScenarioId || !results}
              style={{ opacity: selectedScenarioId && results ? 1 : 0.35 }}
              title="Action Plans"
            >
              <span className="material-symbols-outlined">playlist_add_check</span>
              <span className="nav-tooltip">Action Plans</span>
            </button>

            <button
              className={`nav-btn ${activeTab === 'simulation' ? 'active' : ''}`}
              onClick={() => setActiveTab('simulation')}
              disabled={!selectedScenarioId || !results}
              style={{ opacity: selectedScenarioId && results ? 1 : 0.35 }}
              title="Simulation Twin"
            >
              <span className="material-symbols-outlined">model_training</span>
              <span className="nav-tooltip">Simulation Twin</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', paddingBottom: '8px' }}>
          {isOfflineMode && (
            <div style={{
              fontSize: '8px',
              fontWeight: 800,
              color: 'var(--accent-orange)',
              backgroundColor: 'rgba(197, 94, 43, 0.08)',
              border: '1px solid rgba(197, 94, 43, 0.2)',
              padding: '2px 5px',
              borderRadius: 'var(--radius-sm)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontFamily: 'var(--font-sans)'
            }}>DEMO</div>
          )}
          <div className="user-profile" title={`Logout — ${user?.username || 'Operator'} (${user?.role || 'operator'})`} onClick={handleLogout}>
            {user?.username?.substring(0, 2).toUpperCase() || 'OP'}
          </div>
        </div>
      </nav>

      {/* 2. Central Workspace Content */}
      <main className="main-workspace">
        <header className="workspace-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>FactoryMind AI Dashboard</span>
            <span style={{ color: 'var(--outline)', fontSize: '13px' }}>/</span>
            <div style={{ minWidth: 0 }}>
              <h1 className="workspace-title" style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeTab === 'command' && 'Scenario Control Room'}
                {activeTab === 'ingest' && 'Telemetry Ingestion'}
                {activeTab === 'contradiction' && 'Contradictions'}
                {activeTab === 'planner' && 'Action Plans'}
                {activeTab === 'simulation' && 'Simulation Twin'}
              </h1>
            </div>
          </div>

          <div className="header-actions">
            {activeTab === 'command' && (
              <button className="btn-primary" onClick={() => setIsCreating(true)}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                New Scenario
              </button>
            )}
            <button className="btn-secondary" onClick={fetchScenarios} title="Sync database">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
              Refresh
            </button>
            <span className="material-symbols-outlined" style={{ color: 'var(--outline)', cursor: 'pointer', fontSize: '20px' }}>notifications_active</span>
            <span className="material-symbols-outlined" style={{ color: 'var(--outline)', cursor: 'pointer', fontSize: '20px' }}>settings</span>
          </div>
        </header>

        <div className="workspace-body">
        {!isOfflineMode && !isBackendConnected && (
          <div style={{
            backgroundColor: 'rgba(235, 140, 0, 0.08)',
            borderLeft: '3px solid var(--accent-orange)',
            color: 'var(--on-surface)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            marginBottom: 'var(--gutter)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div>
              <strong>Local backend server is offline.</strong> Make sure to start the Python backend on your system. Alternatively, you can use the offline sandbox mode.
            </div>
            <button 
              onClick={handleOfflineAccess}
              className="btn-primary"
              style={{
                padding: '4px 10px',
                fontSize: '10px',
                backgroundColor: 'var(--accent-orange)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer'
              }}
            >
              Switch to Sandbox
            </button>
          </div>
        )}

        {errorMessage && (
          <div style={{
            backgroundColor: 'rgba(186, 26, 26, 0.06)',
            borderLeft: '3px solid var(--error)',
            color: 'var(--error)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            marginBottom: 'var(--gutter)',
            fontWeight: 500
          }}>
            {errorMessage}
          </div>
        )}

        {/* --- SCENARIO CREATION OVERLAY FORM --- */}
        {isCreating && (
          <div style={{
            position: 'fixed',
            top: 0, right: 0, bottom: 0, left: 0,
            backgroundColor: 'rgba(30, 37, 44, 0.4)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '24px'
          }}>
            <div className="industrial-card" style={{
              width: '100%',
              maxWidth: '820px',
              backgroundColor: 'var(--bg-primary)',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '2px solid var(--accent-bronze)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-navy)', textTransform: 'uppercase' }}>
                  Initialize Intelligent Diagnostics Run
                </h3>
                <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setIsCreating(false)}>Close</button>
              </div>

              <div style={{ marginBottom: '16px', backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span className="form-label" style={{ marginBottom: '6px', display: 'block' }}>Operational Template Presets</span>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`btn-secondary ${selectedPresetId === preset.id && !customCsvData ? 'active' : ''}`}
                      style={{
                        fontSize: '11px',
                        borderColor: selectedPresetId === preset.id && !customCsvData ? 'var(--accent-orange)' : 'var(--border-color)'
                      }}
                      onClick={() => applyPreset(preset.id)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmitScenario} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">Scenario Name</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. Spindle Vibration Deviation"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Asset / Machine ID</label>
                    <select
                      className="form-select"
                      value={machineId}
                      onChange={(e) => setMachineId(e.target.value)}
                    >
                      <option value="Machine 1">Machine 1 (CNC Spindle)</option>
                      <option value="Machine 2">Machine 2 (Coolant Line)</option>
                      <option value="Machine 3">Machine 3 (Tool Carrier)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Incident Context Summary</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Brief description of the warning anomaly pattern"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Narrative Shift Log (Operator Notes)</label>
                      <textarea
                        className="form-textarea"
                        placeholder="Log narrative from shift technicians..."
                        value={operatorNotes}
                        onChange={(e) => setOperatorNotes(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">External Logistics Context (Supplier Email)</label>
                      <textarea
                        className="form-textarea"
                        placeholder="Vendor correspondence regarding spare part status..."
                        value={supplierEmail}
                        onChange={(e) => setSupplierEmail(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Regional / Environmental Warnings (News Feeds)</label>
                      <textarea
                        className="form-textarea"
                        placeholder="Local environment warnings or supply line bulletins..."
                        value={newsUpdates}
                        onChange={(e) => setNewsUpdates(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">CSV Telemetry Stream Ingest</label>
                    <div
                      className="upload-zone"
                      style={{
                        borderColor: isDragging ? 'var(--accent-orange)' : 'var(--border-color)',
                        height: '100%',
                        maxHeight: '220px'
                      }}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <UploadCloud size={32} className="upload-icon" />
                      <p className="upload-text">Drag and drop raw CSV file here</p>
                      <p className="upload-subtext">Supports standard AI4I format with UDI, process and rotational parameters</p>
                      <span style={{ fontSize: '11px', margin: '8px 0', color: 'var(--text-muted)' }}>OR</span>
                      <input
                        type="file"
                        id="csv-file-upload"
                        accept=".csv"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                      />
                      <label htmlFor="csv-file-upload" className="btn-secondary" style={{ padding: '4px 12px', fontSize: '11px', cursor: 'pointer' }}>
                        Browse Local Files
                      </label>
                    </div>

                    {csvFileName && (
                      <div style={{
                        marginTop: '10px',
                        padding: '10px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px'
                      }}>
                        <FileCheck size={16} style={{ color: 'var(--state-success)' }} />
                        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <strong>{csvFileName}</strong>
                          <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>
                            {customCsvData ? `${customCsvData.length} records parsed successfully` : 'Parsing file...'}
                          </span>
                        </div>
                        <button
                          type="button"
                          style={{ border: 'none', background: 'none', color: 'var(--state-critical)', cursor: 'pointer' }}
                          onClick={() => { setCustomCsvData(null); setCsvFileName(''); }}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setIsCreating(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Starting Orchestrator...' : 'Trigger Multi-Agent Analysis'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- SCREEN 1: SCENARIO COMMAND CENTER --- */}
        {activeTab === 'command' && (
          <div className="dashboard-grid">
            {/* Scenarios History & Selection */}
            <div className="grid-span-8">
              <div className="industrial-card" style={{ minHeight: '400px' }}>
                <div className="card-header-row">
                  <h2 className="card-title">
                    <Database size={16} /> Asset Incident Scenarios
                  </h2>
                  <span className="card-subtitle">Active and completed diagnostic jobs</span>
                </div>

                {loadingScenarios ? (
                  <div className="empty-state">
                    <div className="spinner" />
                    <p style={{ marginTop: '12px', fontSize: '12px' }}>Loading scenario database...</p>
                  </div>
                ) : scenarios.length === 0 ? (
                  <div className="empty-state" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <HelpCircle size={44} className="empty-state-icon" style={{ color: 'var(--accent-orange)', marginBottom: '12px' }} />
                    <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-navy)', marginBottom: '8px', textAlign: 'center' }}>Welcome to FactoryMind AI Command Center</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '480px', marginBottom: '24px', lineHeight: '1.5' }}>
                      No scenarios have been run yet. To demonstrate the system's full multi-agent diagnostic capabilities, use our preloaded industrial failure templates.
                    </p>
                    
                    <div style={{ width: '100%', maxWidth: '480px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '18px', textAlign: 'left' }}>
                      <h4 style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--accent-bronze)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.05em' }}>
                        ⚡ Judge & User Demo Quick Start
                      </h4>
                      <ol style={{ fontSize: '12px', color: 'var(--text-primary)', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '10px', lineHeight: '1.4' }}>
                        <li>Click the <strong>+ New Scenario</strong> button in the top menu bar.</li>
                        <li>Select one of the <strong>Operational Template Presets</strong> at the top of the overlay (e.g., <em>Scenario 1: Overstrain Escalation</em>).</li>
                        <li>The incident details, operator notes, emails, and news feeds will prepopulate automatically.</li>
                        <li><strong>No CSV file upload is required</strong>—leaving the file input empty will auto-inject the correct, realistic sensor telemetry.</li>
                        <li>Click <strong>Trigger Multi-Agent Analysis</strong> to watch the 5-agent Antigravity pipeline collaborate and run digital twin simulations in real-time!</li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {scenarios.map(scen => {
                      const isSelected = selectedScenarioId === scen.id;
                      return (
                        <div
                          key={scen.id}
                          style={{
                            padding: '16px',
                            borderRadius: '8px',
                            border: `1px solid ${isSelected ? 'var(--accent-orange)' : 'var(--border-color)'}`,
                            backgroundColor: isSelected ? '#FAF6F0' : 'var(--bg-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'var(--transition-smooth)'
                          }}
                          onClick={() => {
                            setSelectedScenarioId(scen.id);
                            // Reset local analysis view states
                            setAnalysisStatus(scen.status);
                            if (scen.status === 'complete') {
                              setCurrentAgentIndex(5);
                              setAgentProgress(100);
                            }
                          }}
                        >
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor:
                                scen.status === 'complete' ? 'var(--state-success)' :
                                scen.status === 'analyzing' ? 'var(--accent-orange)' :
                                scen.status === 'error' ? 'var(--state-critical)' : 'var(--text-muted)',
                              marginTop: '5px'
                            }} />
                            <div>
                              <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-navy)' }}>{scen.name}</h4>
                              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>
                                {scen.description}
                              </p>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                                Created: {new Date(scen.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span className="agent-status-label" style={{
                              backgroundColor:
                                scen.status === 'complete' ? 'rgba(63, 126, 90, 0.1)' :
                                scen.status === 'analyzing' ? 'rgba(197, 94, 43, 0.1)' : 'rgba(30, 37, 44, 0.05)',
                              color:
                                scen.status === 'complete' ? 'var(--state-success)' :
                                scen.status === 'analyzing' ? 'var(--accent-orange)' : 'var(--text-secondary)'
                            }}>
                              {scen.status}
                            </span>
                            <button
                              style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                              onClick={(e) => handleDeleteScenario(scen.id, e)}
                              title="Delete Scenario"
                            >
                              <Trash2 size={14} />
                            </button>
                            <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Live Orchestrator Timeline status */}
            <div className="grid-span-4">
              <div className="industrial-card" style={{ minHeight: '400px' }}>
                <div className="card-header-row">
                  <h2 className="card-title">
                    <Cpu size={16} /> Autonomous Orchestration State
                  </h2>
                </div>

                {selectedScenarioId ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-muted)' }}>Active Scenario</span>
                      <h3 style={{ fontSize: '15px', color: 'var(--accent-navy)', fontWeight: 800, marginTop: '2px' }}>
                        {scenarios.find(s => s.id === selectedScenarioId)?.name || 'Loading details...'}
                      </h3>
                      
                      <div className="confidence-row" style={{ marginTop: '12px' }}>
                        <span className="confidence-label">Pipeline Progress</span>
                        <div className="confidence-bar">
                          <div className="confidence-fill" style={{ width: `${agentProgress}%`, backgroundColor: analysisStatus === 'error' ? 'var(--state-critical)' : 'var(--accent-orange)' }} />
                        </div>
                        <span className="confidence-label">{agentProgress}%</span>
                      </div>
                    </div>

                    <div className="agent-flow-container">
                      {[
                        { name: 'Machine Health Agent', num: 1, key: 'machine_health' },
                        { name: 'Contradiction Agent', num: 2, key: 'contradiction_detection' },
                        { name: 'Demand Forecast Agent', num: 3, key: 'demand_forecast' },
                        { name: 'Action Planner Agent', num: 4, key: 'action_planning' },
                        { name: 'Simulation Agent', num: 5, key: 'simulation' }
                      ].map((item, idx) => {
                        const isNodeExecuting = analysisStatus === 'analyzing' && currentAgentIndex === idx;
                        const isNodeComplete = currentAgentIndex > idx || analysisStatus === 'complete';
                        
                        return (
                          <div
                            key={item.key}
                            className={`agent-node ${isNodeExecuting ? 'executing' : ''} ${isNodeComplete ? 'complete' : ''}`}
                            style={{ paddingBottom: '14px' }}
                          >
                            <div className="agent-node-badge">
                              {isNodeComplete ? '✓' : item.num}
                            </div>
                            <div style={{ marginLeft: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{
                                fontSize: '12px',
                                fontWeight: isNodeExecuting ? '800' : '600',
                                color: isNodeExecuting ? 'var(--accent-orange)' : isNodeComplete ? 'var(--accent-navy)' : 'var(--text-muted)'
                              }}>
                                {item.name}
                              </span>
                              <span style={{
                                fontSize: '10px',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                color: isNodeExecuting ? 'var(--accent-orange)' : isNodeComplete ? 'var(--state-success)' : 'var(--text-muted)'
                              }}>
                                {isNodeExecuting ? 'running' : isNodeComplete ? 'complete' : 'pending'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button
                        className="btn-primary"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => setActiveTab('ingest')}
                      >
                        <Eye size={14} /> Open Diagnostic Details
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state" style={{ minHeight: '300px' }}>
                    <Info size={32} className="empty-state-icon" />
                    <p style={{ fontSize: '12px' }}>Select an active scenario from the ledger to view the live agent reasoning timeline.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- SCREEN 2 & 3: LIVE TIMELINE & TELEMETRY INGESTION --- */}
        {activeTab === 'ingest' && selectedScenarioId && (
          <div className="dashboard-grid">
            {/* Left Column: Multi-Source inputs & Sensor Telemetry Graph */}
            <div className="grid-span-8" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Data Ingestion Overview */}
              <div className="industrial-card">
                <div className="card-header-row">
                  <h2 className="card-title">
                    <Database size={16} /> Multi-Source Evidence Ingestion
                  </h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Users size={16} style={{ color: 'var(--accent-bronze)' }} />
                      <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-navy)' }}>Operator Shift Notes</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.4' }}>
                      "{results?.data_sources?.find(d => d.source_type === 'operator_note')?.content || 'No technician journals submitted.'}"
                    </p>
                  </div>

                  <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Mail size={16} style={{ color: 'var(--accent-blue)' }} />
                      <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-navy)' }}>Supplier Email Warning</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.4' }}>
                      "{results?.data_sources?.find(d => d.source_type === 'email')?.content || 'No correspondence logged.'}"
                    </p>
                  </div>

                  <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Smartphone size={16} style={{ color: 'var(--accent-orange)' }} />
                      <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-navy)' }}>News & Weather Alerts</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.4' }}>
                      "{results?.data_sources?.find(d => d.source_type === 'news')?.content || 'No ambient notifications logged.'}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Interactive Sensor Telemetry Chart */}
              <div className="industrial-card">
                <div className="card-header-row">
                  <h2 className="card-title">
                    <Activity size={16} /> Physical Sensor Telemetry Readings
                  </h2>
                  <span className="card-subtitle">Real-time vibration, torque, and RPM cycles</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px' }}>
                  {/* Custom SVG Line Chart */}
                  <div style={{ position: 'relative', height: '220px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '10px' }}>
                    
                    {/* Y-Axis guide lines */}
                    <div className="chart-grid-line" style={{ bottom: '25%' }}><span className="chart-axis-label">25%</span></div>
                    <div className="chart-grid-line" style={{ bottom: '50%' }}><span className="chart-axis-label">50%</span></div>
                    <div className="chart-grid-line" style={{ bottom: '75%' }}><span className="chart-axis-label">75%</span></div>
                    
                    {/* Svg paths drawing metrics */}
                    <svg className="chart-line-svg" viewBox="0 0 500 200" preserveAspectRatio="none">
                      {/* Grid border */}
                      <rect x="0" y="0" width="500" height="200" fill="none" stroke="none" />
                      
                      {/* Spindle speed RPM line (Blue) */}
                      <path
                        d="M 10 120 L 100 130 L 200 145 L 300 160 L 400 178 L 490 185"
                        fill="none"
                        stroke="var(--accent-blue)"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      
                      {/* Torque line (Orange - Surging) */}
                      <path
                        d="M 10 70 L 100 80 L 200 100 L 300 135 L 400 168 L 490 182"
                        fill="none"
                        stroke="var(--accent-orange)"
                        strokeWidth="3"
                        strokeDasharray="4 2"
                      />
                      
                      {/* Process Temp line (Amber) */}
                      <path
                        d="M 10 40 L 100 48 L 200 55 L 300 78 L 400 105 L 490 118"
                        fill="none"
                        stroke="var(--accent-amber)"
                        strokeWidth="2"
                      />
                    </svg>

                    <div style={{ position: 'absolute', bottom: '6px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700 }}>
                      <span>SHIFT-START</span>
                      <span>SHIFT-MID</span>
                      <span>CURRENT ANOMALY WINDOW</span>
                    </div>
                  </div>

                  {/* Legend and stats */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '4px', backgroundColor: 'var(--accent-blue)' }} />
                      <div>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800 }}>Spindle speed</span>
                        <strong style={{ display: 'block', fontSize: '13px', color: 'var(--accent-navy)' }}>1,110 rpm</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '4px', backgroundColor: 'var(--accent-orange)', borderBottom: '2px dashed var(--accent-orange)' }} />
                      <div>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800 }}>Torque</span>
                        <strong style={{ display: 'block', fontSize: '13px', color: 'var(--accent-navy)' }}>85.2 Nm</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '4px', backgroundColor: 'var(--accent-amber)' }} />
                      <div>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800 }}>Process Temp</span>
                        <strong style={{ display: 'block', fontSize: '13px', color: 'var(--accent-navy)' }}>308.7 K</strong>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                      <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, display: 'block' }}>Anomalous records</span>
                      <span style={{ fontSize: '11px', color: 'var(--state-critical)', fontWeight: 700 }}>Critical deviation flag active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Active Agent Execution Details */}
            <div className="grid-span-4">
              <div className="industrial-card">
                <div className="card-header-row">
                  <h2 className="card-title">
                    <Cpu size={16} /> Live Agent Orchestration
                  </h2>
                </div>

                <div className="agent-flow-container">
                  {[
                    { key: 'machine_health', name: '1. Machine Health Agent', desc: 'Classifies raw sensor matrix', score: 90 },
                    { key: 'contradiction_detection', name: '2. Contradiction Agent', desc: 'Identifies narrative conflicts', score: 88 },
                    { key: 'demand_forecast', name: '3. Demand Forecast Agent', desc: 'Calculates factory delay impact', score: 94 },
                    { key: 'action_planning', name: '4. Action Planner Agent', desc: 'Designs repair checklist', score: 85 },
                    { key: 'simulation', name: '5. Simulation Agent', desc: 'Twin test & notifications', score: 91 }
                  ].map((agent, index) => {
                    const isRunning = analysisStatus === 'analyzing' && currentAgentIndex === index;
                    const isDone = currentAgentIndex > index || analysisStatus === 'complete';
                    
                    return (
                      <div
                        key={agent.key}
                        className={`agent-node ${isRunning ? 'executing' : ''} ${isDone ? 'complete' : ''}`}
                      >
                        <div className="agent-node-badge">
                          {isDone ? '✓' : index + 1}
                        </div>

                        <div className="agent-card">
                          <div className="agent-header">
                            <h4 className="agent-name-tag">{agent.name}</h4>
                            <span className="agent-status-label">
                              {isRunning ? 'active' : isDone ? 'complete' : 'pending'}
                            </span>
                          </div>
                          
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {agent.desc}
                          </p>

                          {/* Confidence level meter */}
                          {isDone && (
                            <div className="confidence-row">
                              <span className="confidence-label">Confidence:</span>
                              <div className="confidence-bar">
                                <div className="confidence-fill" style={{ width: `${agent.score}%` }} />
                              </div>
                              <span className="confidence-label">{agent.score}%</span>
                            </div>
                          )}

                          {/* Agent Monospace Terminal Thought logs */}
                          {(isRunning || isDone) && agentLogs[agent.key] && (
                            <div style={{ marginTop: '10px' }}>
                              <pre
                                ref={el => { terminalRefs.current[agent.key] = el; }}
                                className="agent-thought-logs"
                              >
                                {agentLogs[agent.key].join('\n')}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- SCREEN 4: CONTRADICTION INTELLIGENCE VIEWER --- */}
        {activeTab === 'contradiction' && selectedScenarioId && results && (
          <div className="industrial-card" style={{ minHeight: '420px' }}>
            <div className="card-header-row" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(207, 149, 58, 0.1)',
                  color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '18px'
                }}>!</div>
                <div>
                  <h2 className="card-title" style={{ fontSize: '16px' }}>Autonomous Contradiction Investigator</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Identifying factual discrepancies between log text and machine sensors</p>
                </div>
              </div>
              <span className="agent-status-label" style={{ backgroundColor: 'rgba(63, 126, 90, 0.1)', color: 'var(--state-success)' }}>
                Verification Complete
              </span>
            </div>

            {results.contradictions && results.contradictions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {results.contradictions.map((contra, idx) => (
                  <div key={contra.id || idx} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{
                      backgroundColor: 'var(--bg-secondary)', padding: '12px 18px', borderBottom: '1px solid var(--border-color)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-navy)' }}>
                        CONFLICT TARGET: {contra.field_name?.toUpperCase() || 'EQUIPMENT OPERATION STATE'}
                      </span>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', fontWeight: 700 }}>
                        <span style={{ color: 'var(--accent-navy)' }}>
                          Confidence weight: {(contra.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <div className="contradiction-box" style={{ border: 'none', borderRadius: 0, margin: 0 }}>
                      <div className="contradiction-pane">
                        <span className="contradiction-source">✦ SOURCE A: {contra.source_a_name}</span>
                        <div className="contradiction-value" style={{ borderLeft: '4px solid var(--state-critical)' }}>
                          {contra.source_a_value}
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          Timestamp logged: {new Date(contra.source_a_timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="contradiction-pane">
                        <span className="contradiction-source">✦ SOURCE B: {contra.source_b_name}</span>
                        <div className="contradiction-value" style={{ borderLeft: '4px solid var(--state-warning)' }}>
                          {contra.source_b_value}
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          Timestamp logged: {new Date(contra.source_b_timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="contradiction-resolution" style={{ backgroundColor: '#FAF6F0', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <CheckCircle2 size={16} style={{ color: 'var(--state-success)' }} />
                          <h4 className="resolution-title" style={{ margin: 0, fontSize: '13px' }}>AI-AGENT RESOLUTION DECISION</h4>
                        </div>
                        <p className="resolution-text">
                          {contra.resolution}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ minHeight: '260px' }}>
                <CheckCircle size={48} style={{ color: 'var(--state-success)', marginBottom: '12px' }} />
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-navy)' }}>No contradictions identified</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  The shift operators and sensor data metrics are in alignment for this scenario.
                </p>
              </div>
            )}
          </div>
        )}

        {/* --- SCREEN 5: ACTION PLANNING DASHBOARD --- */}
        {activeTab === 'planner' && selectedScenarioId && results && (
          <div className="dashboard-grid">
            <div className="grid-span-8">
              <div className="industrial-card" style={{ minHeight: '400px' }}>
                <div className="card-header-row">
                  <h2 className="card-title">
                    <FileText size={16} /> Recommended physical mitigation procedures
                  </h2>
                </div>

                <div className="action-list">
                  {results.actions && results.actions.length > 0 ? (
                    results.actions.map(action => (
                      <div key={action.id} className="action-card">
                        <div className="action-title-row">
                          <div>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-bronze)', textTransform: 'uppercase' }}>
                              CODE: {action.action_code || 'ACT'}
                            </span>
                            <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-navy)', marginTop: '2px' }}>
                              {action.title}
                            </h3>
                          </div>
                          <span className={`action-priority-badge p${action.priority || 2}`}>
                            PRIORITY P{action.priority || 2}
                          </span>
                        </div>

                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.5' }}>
                          {action.description}
                        </p>

                        <div className="action-metrics">
                          <div className="action-metric-item">
                            <span>Labor:</span>
                            <span className="action-metric-val">{action.effort_hours} Hours</span>
                          </div>
                          <div className="action-metric-item">
                            <span>Estimated Budget:</span>
                            <span className="action-metric-val">{action.currency || 'USD'} {action.cost_estimate}</span>
                          </div>
                          <div className="action-metric-item">
                            <span>Target Asset Location:</span>
                            <span className="action-metric-val">{action.target_system}</span>
                          </div>
                        </div>

                        {/* Substep checklist */}
                        {results.action_steps && results.action_steps.filter(s => s.action_id === action.id).length > 0 && (
                          <div className="step-checklist">
                            {results.action_steps
                              .filter(s => s.action_id === action.id)
                              .map(step => (
                                <div key={step.id} className="step-item">
                                  <span className="step-bullet">■</span>
                                  <div>
                                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                      {step.description}
                                    </span>
                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                                      Target actor: {step.target_actor} | Duration: {step.estimated_duration_min} mins
                                    </span>
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <p style={{ fontSize: '12px' }}>No actions planned.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ingestion stats summary */}
            <div className="grid-span-4">
              <div className="industrial-card">
                <div className="card-header-row">
                  <h2 className="card-title">Mitigation Cost & Impact</h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800 }}>Total estimated cost</span>
                    <h3 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--accent-navy)', margin: '8px 0' }}>
                      $ {results.actions ? results.actions.reduce((acc, curr) => acc + (curr.cost_estimate || 0), 0) : 0}
                    </h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Pre-approved contingency threshold</span>
                  </div>

                  <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800, display: 'block', marginBottom: '8px' }}>Action distribution</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Maintenance Intervention</span>
                        <strong style={{ color: 'var(--accent-navy)' }}>1 Recommended</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Production Rescheduling</span>
                        <strong style={{ color: 'var(--accent-navy)' }}>1 Recommended</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Procurement Orders</span>
                        <strong style={{ color: 'var(--text-muted)' }}>0 Pending</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- SCREEN 6: SIMULATION & RECOVERY CENTER --- */}
        {activeTab === 'simulation' && selectedScenarioId && results && (
          <div className="dashboard-grid">
            {/* Simulation OEE metrics */}
            <div className="grid-span-8">
              <div className="industrial-card" style={{ minHeight: '380px' }}>
                <div className="card-header-row">
                  <h2 className="card-title">
                    <Activity size={16} /> Digital Twin Simulation Results
                  </h2>
                  <span className="card-subtitle">Projected machine telemetry following load recovery adjustments</span>
                </div>

                {results.simulations && results.simulations.length > 0 ? (
                  results.simulations.map(sim => {
                    if (!sim) return null;
                    const parseVal = (val: any, fallback: number) => {
                      if (val === undefined || val === null) return fallback;
                      const parsed = typeof val === 'number' ? val : parseFloat(val);
                      return isNaN(parsed) ? fallback : parsed;
                    };

                    const beforeRisk = parseVal(sim.before_state?.risk_score, 82);
                    const beforeOEE = parseVal(sim.before_state?.production_efficiency, 74);
                    const afterRisk = parseVal(sim.after_state?.risk_score, 16);
                    const afterOEE = parseVal(sim.after_state?.production_efficiency, 88);

                    // Inline Circular Gauge Renderer
                    const renderCircularGauge = (value: any, color: string, label: string) => {
                      const numeric = parseVal(value, 0);
                      const cleanVal = Math.min(100, Math.max(0, numeric));
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <div style={{ position: 'relative', width: '68px', height: '68px' }}>
                            <svg width="100%" height="100%" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="rgba(255, 255, 255, 0.08)"
                                strokeWidth="3"
                              />
                              <path
                                strokeDasharray={`${cleanVal}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke={color}
                                strokeWidth="3"
                                strokeLinecap="round"
                                style={{ transition: 'stroke-dasharray 0.5s ease-in-out' }}
                              />
                            </svg>
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              fontSize: '13px',
                              fontWeight: 800,
                              color: '#fff'
                            }}>
                              {cleanVal}%
                            </div>
                          </div>
                          <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{label}</span>
                        </div>
                      );
                    };

                    // Inline Telemetry Bar Renderer
                    const renderTelemetryBar = (name: string, beforeVal: any, afterVal: any, unit: string) => {
                      const bVal = parseVal(beforeVal, 0);
                      const aVal = parseVal(afterVal, 0);
                      const total = bVal + aVal;
                      const pct = total > 0 ? (bVal / total) * 100 : 0;
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', backgroundColor: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>{name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--state-critical)' }}>{bVal}{unit}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>➔</span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--state-success)' }}>{aVal}{unit}</span>
                          </div>
                          <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', display: 'flex', marginTop: '4px' }}>
                            <div style={{ width: `${pct}%`, backgroundColor: 'var(--state-critical)', opacity: 0.5 }} />
                            <div style={{ flex: 1, backgroundColor: 'var(--state-success)' }} />
                          </div>
                        </div>
                      );
                    };

                    const matchedAction = results.actions?.find(a => a.id === sim.action_id || a.action_code === sim.action_id);
                    const simTitle = sim.title || matchedAction?.title || `Mitigation Run (${sim.action_id})`;

                    return (
                      <div key={sim.id} style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px', borderBottom: '2px dashed var(--border-color)', marginTop: results.simulations && sim.id === results.simulations[0].id ? '0px' : '20px' }}>
                        {/* Simulation Target Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', backgroundColor: 'rgba(207, 149, 58, 0.1)', color: 'var(--accent-bronze)', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.04em' }}>
                            SIMULATED ACTION
                          </span>
                          <strong style={{ fontSize: '12px', color: 'var(--accent-navy)' }}>{simTitle}</strong>
                        </div>

                        {/* 1. Sync Signal Header */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: 'rgba(34, 197, 94, 0.05)',
                          border: '1px dashed rgba(34, 197, 94, 0.2)',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          color: 'var(--state-success)',
                          fontWeight: 600,
                          marginBottom: '5px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="pulse-indicator" style={{
                              width: '8px',
                              height: '8px',
                              backgroundColor: 'var(--state-success)',
                              borderRadius: '50%',
                              display: 'inline-block',
                              boxShadow: '0 0 8px var(--state-success)'
                            }}></span>
                            <span>DIGITAL TWIN STATUS: SYNCHRONIZED & ACTIVE</span>
                          </div>
                          <span style={{ fontSize: '10px', opacity: 0.8, fontFamily: 'var(--font-mono)' }}>REFRESH RATE: 50Hz</span>
                        </div>

                        {/* 2. Before vs After State Circle Gauges */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto 1fr',
                          gap: '20px',
                          alignItems: 'center',
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '20px'
                        }}>
                          {/* Before State */}
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '16px',
                            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.04), rgba(239, 68, 68, 0.01))',
                            border: '1px solid rgba(239, 68, 68, 0.15)',
                            borderRadius: '8px'
                          }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--state-critical)', letterSpacing: '0.05em' }}>Before Action</span>
                            <div style={{ display: 'flex', gap: '16px' }}>
                              {renderCircularGauge(beforeRisk, 'var(--state-critical)', 'Risk Index')}
                              {renderCircularGauge(beforeOEE, '#f59e0b', 'OEE')}
                            </div>
                          </div>

                          <div style={{ fontSize: '18px', color: 'var(--text-muted)', fontWeight: 800 }}>➔</div>

                          {/* After State */}
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '16px',
                            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.04), rgba(34, 197, 94, 0.01))',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                            borderRadius: '8px'
                          }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--state-success)', letterSpacing: '0.05em' }}>After Mitigation</span>
                            <div style={{ display: 'flex', gap: '16px' }}>
                              {renderCircularGauge(afterRisk, 'var(--state-success)', 'Risk Index')}
                              {renderCircularGauge(afterOEE, 'var(--accent-blue)', 'OEE')}
                            </div>
                          </div>
                        </div>

                        {/* 3. Physical Telemetry Parameter Deltas */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                          {renderTelemetryBar('Joint Temperature', 319.2, 301.6, ' K')}
                          {renderTelemetryBar('Vibration Severity', 2.3, 0.5, ' mm/s')}
                          {renderTelemetryBar('Duty Cycle Load', 92.5, 45.0, '%')}
                        </div>

                        {/* 4. Terminal Log Details */}
                        <div style={{ backgroundColor: '#0c0f17', padding: '16px', borderRadius: '8px', border: '1px solid #1a2333', marginTop: '5px', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)' }}>
                          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-orange)', fontWeight: 800, display: 'block', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>$ cat /var/log/digital_twin_simulation.log</span>
                          <div className="sim-logs" style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)', maxHeight: '110px', overflowY: 'auto' }}>
                            {sim.execution_log ? (
                              sim.execution_log.map((log: any, lIdx: number) => (
                                <div key={lIdx} style={{ marginBottom: '4px', fontSize: '11px' }}>
                                  <span style={{ color: '#22c55e' }}>[{log.timestamp || '12:00:00'}]</span> {log.message}
                                </div>
                              ))
                            ) : (
                              sim.execution_steps && sim.execution_steps.map((step: string, lIdx: number) => (
                                <div key={lIdx} style={{ marginBottom: '4px', fontSize: '11px' }}>
                                  <span style={{ color: '#22c55e' }}>[STEP-{lIdx + 1}]</span> {step}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-state">
                    <p style={{ fontSize: '12px' }}>No simulation profiles logged for this scenario.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Generated Alerts notifications */}
            <div className="grid-span-4">
              <div className="industrial-card" style={{ minHeight: '380px' }}>
                <div className="card-header-row">
                  <h2 className="card-title">
                    <Mail size={16} /> Dispatched Alerts Log
                  </h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {results.notifications && results.notifications.length > 0 ? (
                    results.notifications.map((notif, nIdx) => (
                      <div key={notif.id || nIdx} style={{
                        backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                        borderRadius: '6px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '9px', fontWeight: 800, textTransform: 'uppercase',
                            backgroundColor:
                              notif.channel === 'Email' ? 'rgba(75, 110, 138, 0.1)' : 'rgba(197, 94, 43, 0.1)',
                            color:
                              notif.channel === 'Email' ? 'var(--accent-blue)' : 'var(--accent-orange)',
                            padding: '2px 6px', borderRadius: '4px'
                          }}>{notif.channel}</span>
                          <span style={{ fontSize: '10px', color: 'var(--state-success)', fontWeight: 700 }}>✓ DISPATCHED</span>
                        </div>
                        <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-navy)', marginTop: '4px' }}>
                          Recipient: {notif.recipient_name} ({notif.recipient_role})
                        </h4>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', fontStyle: 'italic', marginTop: '2px' }}>
                          "{notif.message_body}"
                        </p>
                      </div>
                    ))
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Standard Mock dispatched notifications if blank */}
                      <div style={{
                        backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                        borderRadius: '6px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', backgroundColor: 'rgba(75, 110, 138, 0.1)', color: 'var(--accent-blue)', padding: '2px 6px', borderRadius: '4px' }}>Email</span>
                          <span style={{ fontSize: '10px', color: 'var(--state-success)', fontWeight: 700 }}>✓ DISPATCHED</span>
                        </div>
                        <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-navy)', marginTop: '4px' }}>
                          Recipient: Maintenance Coordinator
                        </h4>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', fontStyle: 'italic', marginTop: '2px' }}>
                          "ALERT: Machine 1 is flagged with elevated failure risk. Automated dispatch protocol recommends Spindle assembly check."
                        </p>
                      </div>

                      <div style={{
                        backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                        borderRadius: '6px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', backgroundColor: 'rgba(197, 94, 43, 0.1)', color: 'var(--accent-orange)', padding: '2px 6px', borderRadius: '4px' }}>SMS</span>
                          <span style={{ fontSize: '10px', color: 'var(--state-success)', fontWeight: 700 }}>✓ DISPATCHED</span>
                        </div>
                        <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-navy)', marginTop: '4px' }}>
                          Recipient: Shift Supervisor
                        </h4>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', fontStyle: 'italic', marginTop: '2px' }}>
                          "URGENT: Lower load immediately on Machine 1 spindle to stabilize process temperature. Check instructions on console."
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        </div>{/* end workspace-body */}
      </main>

      {/* 3. Right-side Contextual Intelligence Panel */}
      <aside className="side-panel">
        <div className="side-panel-header">
          <span className="material-symbols-outlined" style={{ color: 'var(--accent-orange)', fontSize: '18px' }}>query_stats</span>
          Contextual Intelligence
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--outline-variant)', flexShrink: 0 }}>
          <div style={{ flex: 1, padding: '8px 0', textAlign: 'center', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--secondary)', borderBottom: '2px solid var(--secondary)', cursor: 'pointer' }}>Alarms</div>
          <div style={{ flex: 1, padding: '8px 0', textAlign: 'center', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--outline)', cursor: 'pointer' }}>Logs</div>
          <div style={{ flex: 1, padding: '8px 0', textAlign: 'center', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--outline)', cursor: 'pointer' }}>Predictive</div>
        </div>

        <div className="alerts-list">
          {alerts.map(alert => (
            <div key={alert.id} className={`alert-item ${alert.severity}`}>
              <div className="alert-title-row">
                <span className="alert-title">{alert.title}</span>
                <span className="alert-time">{alert.time}</span>
              </div>
              <p className="alert-desc">{alert.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--outline-variant)', padding: 'var(--stack-sm) var(--stack-sm)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--outline)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
            <span>Network Health</span>
            <span style={{ color: 'var(--state-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--state-success)', display: 'inline-block' }} />
              ONLINE
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--outline)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <span>Backend Gateway</span>
            <span style={{ color: isOfflineMode ? 'var(--accent-orange)' : (isBackendConnected ? 'var(--state-success)' : 'var(--state-critical)') }}>
              {isOfflineMode ? 'SANDBOX' : (isBackendConnected ? 'CONNECTED' : 'DISCONNECTED')}
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}

// Generate Mock Scenario Results fallback when offline or lacking backend resources
function generateMockScenarioResults(
  scenarioId: string,
  name: string,
  desc: string,
  machineId: string,
  operatorNotes: string,
  supplierEmail: string,
  newsUpdates: string
): ScenarioResults {
  const isOverstrain = name.includes('Overstrain');
  const isCooling = name.includes('Cooling');
  
  const riskScore = isOverstrain ? 82 : isCooling ? 76 : 64;
  const failureType = isOverstrain ? 'Overstrain Failure' : isCooling ? 'Heat Dissipation Failure' : 'Tool Wear Breakdown';

  return {
    scenario: {
      id: scenarioId,
      name,
      description: desc,
      status: 'complete',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    data_sources: [
      { id: 'ds-1', scenario_id: scenarioId, source_type: 'operator_note', content: operatorNotes || 'No notes.', created_at: new Date().toISOString() },
      { id: 'ds-2', scenario_id: scenarioId, source_type: 'email', content: supplierEmail || 'No email.', created_at: new Date().toISOString() },
      { id: 'ds-3', scenario_id: scenarioId, source_type: 'news', content: newsUpdates || 'No alerts.', created_at: new Date().toISOString() }
    ],
    insights: [
      {
        id: 'ins-1',
        scenario_id: scenarioId,
        category: 'machine_health',
        severity: 'critical',
        title: `${machineId} failure signature detected`,
        description: `${machineId} is displaying a high-risk profile for ${failureType}. Sensor values indicate rapid deviation.`,
        evidence: { risk_score: riskScore, machine_id: machineId },
        confidence: 0.92,
        machine_id: machineId,
        created_at: new Date().toISOString()
      },
      {
        id: 'ins-2',
        scenario_id: scenarioId,
        category: 'demand',
        severity: 'high',
        title: 'Production Demand & Supply Gap Forecast',
        description: `Backlog delivery at risk. Projected stockout risk: 78%. Raw material runway: 4 days. Backlog delay will impact batch B482.`,
        evidence: { stockout_risk_pct: 78, raw_material_days: 4 },
        confidence: 0.85,
        machine_id: machineId,
        created_at: new Date().toISOString()
      }
    ],
    contradictions: [
      {
        id: 'con-1',
        scenario_id: scenarioId,
        field_name: 'spindle_status',
        source_a_name: 'Machine Telemetry Sensor',
        source_a_value: `Vibration spike, Torque surge to 85.2 Nm, RPM degradation`,
        source_a_timestamp: new Date(Date.now() - 600000).toISOString(),
        source_b_name: 'Shift Log Narrative',
        source_b_value: operatorNotes || 'Machine running normally',
        source_b_timestamp: new Date(Date.now() - 1200000).toISOString(),
        resolution: 'Telemetry readings are prioritized. Operator log displays scheduling mismatch or lag in report filing.',
        confidence: 0.88,
        created_at: new Date().toISOString()
      }
    ],
    actions: [
      {
        id: 'ACT-001',
        scenario_id: scenarioId,
        action_code: 'ACT-001',
        title: `Dampen Spindle Load on ${machineId}`,
        description: `Reduce physical feedrate to 60% capacity on the active shift to stabilize spindle bearing and avoid catastrophic breakdown.`,
        priority: 1,
        category: 'maintenance',
        effort_hours: 2,
        cost_estimate: 900,
        currency: 'USD',
        target_system: machineId,
        status: 'recommended',
        created_at: new Date().toISOString()
      },
      {
        id: 'ACT-002',
        scenario_id: scenarioId,
        action_code: 'ACT-002',
        title: `Route backlog production to Line 2`,
        description: `Reassign target batches temporarily to Line 2 CNC machine to maintain supplier agreement requirements.`,
        priority: 2,
        category: 'production',
        effort_hours: 1,
        cost_estimate: 350,
        currency: 'USD',
        target_system: 'Production Line 2 scheduler',
        status: 'recommended',
        created_at: new Date().toISOString()
      }
    ],
    action_steps: [
      { id: 'step-1', action_id: 'ACT-001', step_order: 1, description: 'Isolate current CNC control board parameters.', target_actor: 'Shift Supervisor', estimated_duration_min: 15 },
      { id: 'step-2', action_id: 'ACT-001', step_order: 2, description: 'Check spindle coupling stability and thermal scan.', target_actor: 'Maintenance Tech', estimated_duration_min: 45 },
      { id: 'step-3', action_id: 'ACT-002', step_order: 1, description: 'Reassign schedule load in routing database.', target_actor: 'Planner', estimated_duration_min: 20 }
    ],
    simulations: [
      {
        id: 'sim-1',
        scenario_id: scenarioId,
        action_id: 'ACT-001',
        before_state: { risk_score: riskScore, production_efficiency: 74 },
        after_state: { risk_score: 16, production_efficiency: 88 },
        delta: { risk_reduction: -66, efficiency_gain: 14 },
        execution_log: [
          { timestamp: '12:00:01', message: 'Applied load reduction vector to Spindle assembly.' },
          { timestamp: '12:00:03', message: 'Recalculating expected vibration frequency...' },
          { timestamp: '12:00:05', message: 'Risk stabilized to acceptable thresholds. Alerts generated.' }
        ],
        created_at: new Date().toISOString()
      }
    ],
    ml_predictions: []
  };
}
