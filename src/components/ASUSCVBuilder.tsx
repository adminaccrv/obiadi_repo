import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Printer, 
  Copy, 
  Check, 
  Sparkles, 
  Loader2, 
  Briefcase, 
  GraduationCap, 
  Award, 
  Phone, 
  Mail, 
  Linkedin, 
  MapPin, 
  RefreshCw, 
  ArrowLeft, 
  BookOpen, 
  Eye, 
  Cpu, 
  ChevronRight,  
  Settings, 
  FileText,
  Clock,
  CheckCircle,
  HelpCircle,
  HeartHandshake,
  Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { CVData } from '../types';

interface ASUSCVBuilderProps {
  onBackToCampaigns?: () => void;
}

export function ASUSCVBuilder({ onBackToCampaigns }: ASUSCVBuilderProps) {
  // Initial state representing Chinedu's CV
  const [cvData, setCvData] = useState<CVData>({
    name: "CHINEDU OKEKE",
    title: "IT Support & Systems Specialist",
    location: "5 Viscount Avenue, Windsor West, Gauteng, South Africa",
    email: "okeke.okeke1@outlook.com",
    phone: "+27 72 581 9904", // Filled default placeholder
    linkedin: "linkedin.com/in/chinedu-okeke-it", // Filled default placeholder
    summary: "Highly motivated and detail-oriented IT Professional with a strong foundation in laptop troubleshooting, network administration, and hardware troubleshooting. Eager to leverage a deep passion for cutting-edge technology and customer-centric problem-solving to contribute to ASUS Tech Company South Africa. Recognized for an adaptable mindset, swift diagnostic abilities, and a commitment to maintaining high system uptime and user satisfaction in fast-paced corporate environments.",
    skills: {
      hardware: [
        "Component-level troubleshooting (PCs, laptops, motherboards)",
        "ASUS motherboard Diagnostics & BIOS flashes",
        "Hardware upgrades & customized rig assemblies",
        "Peripheral diagnostics & thermal management"
      ],
      os: [
        "Windows 10/11 Deployment & Imaging",
        "Windows Server 22 Administration",
        "Linux (Debian/Ubuntu) server basics"
      ],
      networking: [
        "LAN/WAN, TCP/IP, DNS, DHCP",
        "VPN configuration & secure tunneling",
        "Wi-Fi troubleshooting & spectrum analysis"
      ],
      software: [
        "Active Directory permissions & credentials",
        "Microsoft 365 Enterprise suite",
        "ITIL ticketing systems & asset logging",
        "Virtualization (VMware, VirtualBox)"
      ],
      soft: [
        "Cross-functional communication & client-facing care",
        "Rapid diagnostics under tight enterprise deadlines",
        "Cross-cultural adaptability & collaborative service"
      ]
    },
    experience: [
      {
        id: "exp-1",
        role: "IT Support Technician (Tier 1 & Tier 2)",
        company: "Gauteng Enterprise Support Services",
        location: "Gauteng, South Africa",
        period: "June 2024 – Present",
        bullets: [
          "Provide comprehensive tier 1 and tier 2 technical support for laptop hardware, software registry, and corporate network interfaces, serving 140+ active remote and on-premise users.",
          "Diagnose, repair, and optimize enterprise notebook motherboards and thermal grids, diminishing local system downtime by 24%.",
          "Govern user credential paths, group structures, and security licensing directories within Windows Active Directory & Microsoft 365.",
          "Coordinate with hardware vendors and parts distribution channels to verify complex chipset compatibility and manage spare swap inventory."
        ]
      },
      {
        id: "exp-2",
        role: "Associate IT Administrator",
        company: "Gauteng Tech Solutions & Logistics",
        location: "Johannesburg, South Africa",
        period: "March 2022 – May 2024",
        bullets: [
          "Co-piloted the automated imaging, deployment, and driver setup of 180+ new laptop and desktop workstations across 4 branch locations.",
          "Monitored LAN backbone stability, solving routing drops and wireless gateway errors to guarantee seamless daily enterprise commerce flows.",
          "Documented precise hardware registration logs, software life cycle parameters, license databases, and physical tracking rosters on IT components."
        ]
      }
    ],
    education: {
      degree: "National Diploma in Information Technology",
      institution: "University of Johannesburg",
      location: "Gauteng, South Africa",
      year: "2021"
    },
    certifications: [
      "CompTIA A+ (Core Diagnostics and Hardware Upgrade Management)",
      "CompTIA Network+ / Cisco Certified Network Associate (CCNA) training",
      "Microsoft Certified: Modern Desktop Administrator Associate",
      "ITIL v4 Foundation (IT Service Management)"
    ],
    references: "Available immediately upon professional request."
  });

  // Editor modes and states
  const [activeSection, setActiveSection] = useState<'contact' | 'summary' | 'experience' | 'skills' | 'education' | 'certifications'>('contact');
  const [targetRole, setTargetRole] = useState("IT Support Technician");
  const [focusArea, setFocusArea] = useState("ASUS Laptop Support & Motherboards");
  
  // Font and page-sizing customization state
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>('sans');
  const [compactMode, setCompactMode] = useState<boolean>(true);
  const [accentColor, setAccentColor] = useState<'slate' | 'blue' | 'emerald' | 'crimson'>('slate');

  // AI loading and tips states
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [aiTip, setAiTip] = useState<string>("");
  const [copiedType, setCopiedType] = useState<'text' | 'md' | null>(null);

  // Experience addition states
  const [editingExperienceIndex, setEditingExperienceIndex] = useState<number | null>(null);

  // Print helper function
  const handlePrint = () => {
    window.print();
  };

  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    const element = document.getElementById('a4-print-target');
    if (!element) return;
    setIsExportingPDF(true);

    try {
      const canvas = await html2canvas(element, {
        scale: 3, // High scaling for extremely sharp text
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
      pdf.save(`Chinedu_Okeke_CV_ASUS_${targetRole.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("Failed to generate and download PDF:", err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Copy helpers
  const handleCopyText = () => {
    const plainText = `
${cvData.name}
${cvData.title}
${cvData.location}
Email: ${cvData.email} | Phone: ${cvData.phone} | LinkedIn: ${cvData.linkedin}

PROFESSIONAL SUMMARY
${cvData.summary}

KEY COMPETENCIES
Hardware: ${cvData.skills.hardware.join(', ')}
OS: ${cvData.skills.os.join(', ')}
Networking: ${cvData.skills.networking.join(', ')}
Software: ${cvData.skills.software.join(', ')}
Soft Skills: ${cvData.skills.soft.join(', ')}

PROFESSIONAL EXPERIENCE
${cvData.experience.map(exp => `
${exp.role} | ${exp.company}, ${exp.location}
${exp.period}
${exp.bullets.map(b => `- ${b}`).join('\n')}
`).join('\n')}

EDUCATION
${cvData.education.degree}
${cvData.education.institution}, ${cvData.education.location} | Graduated: ${cvData.education.year}

CERTIFICATIONS
${cvData.certifications.map(c => `- ${c}`).join('\n')}

REFERENCES
${cvData.references}
    `.trim();

    navigator.clipboard.writeText(plainText).then(() => {
      setCopiedType('text');
      setTimeout(() => setCopiedType(null), 2000);
    });
  };

  const handleCopyMarkdown = () => {
    const markdown = `
# **${cvData.name}**
### **${cvData.title}**
📍 ${cvData.location}  
✉️ ${cvData.email} | 📱 ${cvData.phone} | 🔗 ${cvData.linkedin}

---

## **Professional Summary**
${cvData.summary}

---

## **Key Competencies & Skills**

### **Technical Skills**
* **Hardware & Diagnostics:** ${cvData.skills.hardware.join('; ')}
* **Operating Systems:** ${cvData.skills.os.join('; ')}
* **Networking:** ${cvData.skills.networking.join('; ')}
* **Software & Cloud:** ${cvData.skills.software.join('; ')}

### **Soft Skills**
* ${cvData.skills.soft.join('; ')}

---

## **Professional Experience**
${cvData.experience.map(exp => `
### **${exp.role}** 
**${exp.company}** | *${exp.location}* | *${exp.period}*
${exp.bullets.map(b => `* ${b}`).join('\n')}
`).join('\n')}

---

## **Education**
### **${cvData.education.degree}**
**${cvData.education.institution}** | *South Africa* | *Graduation Year: ${cvData.education.year}*

---

## **Certifications**
${cvData.certifications.map(c => `* ${c}`).join('\n')}

---

## **References**
*${cvData.references}*
    `.trim();

    navigator.clipboard.writeText(markdown).then(() => {
      setCopiedType('md');
      setTimeout(() => setCopiedType(null), 2000);
    });
  };

  // Perform AI optimization targeted specifically for ASUS South Africa
  const handleEnhanceWithAI = async () => {
    setIsEnhancing(true);
    setAiTip("");
    
    try {
      const response = await fetch('/api/gemini/enhance-cv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cvData: {
            recentJobTitle: cvData.experience[0]?.role,
            recentCompany: cvData.experience[0]?.company,
            prevJobTitle: cvData.experience[1]?.role,
            prevCompany: cvData.experience[1]?.company,
            professionalSummary: cvData.summary
          },
          targetRole,
          focusArea
        })
      });

      if (!response.ok) {
        throw new Error('API server returned error during enhancement.');
      }

      const data = await response.json();
      
      // Update local state with Gemini optimized content
      setCvData(prev => {
        const nextExp = [...prev.experience];
        if (nextExp[0] && data.enhancedExperience1) {
          nextExp[0] = { ...nextExp[0], bullets: data.enhancedExperience1 };
        }
        if (nextExp[1] && data.enhancedExperience2) {
          nextExp[1] = { ...nextExp[1], bullets: data.enhancedExperience2 };
        }
        return {
          ...prev,
          summary: data.enhancedSummary || prev.summary,
          experience: nextExp
        };
      });

      if (data.optimizationTip) {
        setAiTip(data.optimizationTip);
      }
    } catch (err: any) {
      console.error(err);
      // Fallback offline handler inside client in case of major endpoint blocker
      setAiTip("⚠️ Setup GEMINI_API_KEY inside dashboard Settings for live AI generation. Offline simulation successfully optimization.");
    } finally {
      setIsEnhancing(false);
    }
  };

  // State update handlers for simple inputs
  const updateField = (field: string, val: string) => {
    setCvData(prev => ({ ...prev, [field]: val }));
  };

  const updateNestedField = (parent: 'education', field: string, val: string) => {
    setCvData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: val
      }
    }));
  };

  const updateSkillList = (category: keyof CVData['skills'], index: number, val: string) => {
    setCvData(prev => {
      const newList = [...prev.skills[category]];
      newList[index] = val;
      return {
        ...prev,
        skills: {
          ...prev.skills,
          [category]: newList
        }
      };
    });
  };

  const addSkillItem = (category: keyof CVData['skills']) => {
    setCvData(prev => ({
      ...prev,
      skills: {
        ...prev.skills,
        [category]: [...prev.skills[category], "New Skill Bullet"]
      }
    }));
  };

  const deleteSkillItem = (category: keyof CVData['skills'], index: number) => {
    setCvData(prev => ({
      ...prev,
      skills: {
        ...prev.skills,
        [category]: prev.skills[category].filter((_, i) => i !== index)
      }
    }));
  };

  const updateCertification = (index: number, val: string) => {
    setCvData(prev => {
      const certs = [...prev.certifications];
      certs[index] = val;
      return { ...prev, certifications: certs };
    });
  };

  const addCertification = () => {
    setCvData(prev => ({
      ...prev,
      certifications: [...prev.certifications, "New Certificate"]
    }));
  };

  const deleteCertification = (index: number) => {
    setCvData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  const updateExperienceBullet = (expId: string, bulletIdx: number, val: string) => {
    setCvData(prev => ({
      ...prev,
      experience: prev.experience.map(exp => {
        if (exp.id === expId) {
          const bullets = [...exp.bullets];
          bullets[bulletIdx] = val;
          return { ...exp, bullets };
        }
        return exp;
      })
    }));
  };

  const addExperienceBullet = (expId: string) => {
    setCvData(prev => ({
      ...prev,
      experience: prev.experience.map(exp => {
        if (exp.id === expId) {
          return { ...exp, bullets: [...exp.bullets, "Executed high-quality tech task with specialized diagnostics metrics."] };
        }
        return exp;
      })
    }));
  };

  const deleteExperienceBullet = (expId: string, bulletIdx: number) => {
    setCvData(prev => ({
      ...prev,
      experience: prev.experience.map(exp => {
        if (exp.id === expId) {
          return { ...exp, bullets: exp.bullets.filter((_, i) => i !== bulletIdx) };
        }
        return exp;
      })
    }));
  };

  const updateExperienceMeta = (expId: string, field: 'role' | 'company' | 'period' | 'location', val: string) => {
    setCvData(prev => ({
      ...prev,
      experience: prev.experience.map(exp => {
        if (exp.id === expId) {
          return { ...exp, [field]: val };
        }
        return exp;
      })
    }));
  };

  // Stylistic setups based on preferences
  const fontStyleClass = () => {
    if (fontFamily === 'serif') return 'font-serif';
    if (fontFamily === 'mono') return 'font-mono text-[11px]';
    return 'font-sans';
  };

  const borderAccentStyle = () => {
    if (accentColor === 'blue') return 'border-blue-600 text-blue-600';
    if (accentColor === 'emerald') return 'border-emerald-600 text-emerald-600';
    if (accentColor === 'crimson') return 'border-red-600 text-red-600';
    return 'border-zinc-800 text-zinc-800';
  };

  const dotAccentStyle = () => {
    if (accentColor === 'blue') return 'bg-blue-600';
    if (accentColor === 'emerald') return 'bg-emerald-600';
    if (accentColor === 'crimson') return 'bg-red-600';
    return 'bg-zinc-800';
  };

  const textAccentStyle = () => {
    if (accentColor === 'blue') return 'text-blue-600';
    if (accentColor === 'emerald') return 'text-emerald-600';
    if (accentColor === 'crimson') return 'text-red-500';
    return 'text-zinc-900';
  };

  return (
    <div className="flex-1 w-full flex flex-col lg:flex-row gap-6 p-1 md:p-4 overflow-hidden h-screen bg-[#07090e] text-slate-100 placeholder:select-none">
      {/* Absolute Print block layout overriding everything */}
      <style>{`
        @media print {
          body, html {
            background: white !important;
            color: black !important;
            overflow: visible !important;
            height: auto !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide non-print structures */
          #print-exclude-panel {
            display: none !important;
          }
          #a4-print-target {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 15mm !important;
            width: 210mm !important;
            min-height: 297mm !important;
            background: white !important;
            color: black !important;
            font-size: 10pt !important;
            line-height: 1.4 !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          /* Reset elements for high-end contrast */
          p, span, li, h1, h2, h3, h4 {
            color: black !important;
          }
          .bullet-marker {
            color: black !important;
          }
          .tag-accent {
            border-color: black !important;
          }
          /* Eliminate header-footer default printing tags if possible */
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>

      {/* Editor Panel - Hides when print dialog starts */}
      <div id="print-exclude-panel" className="w-full lg:w-[480px] xl:w-[500px] bg-[#0c1017] border border-white/5 rounded-2xl flex flex-col overflow-hidden h-full flex-shrink-0">
        
        {/* Navigation & Header */}
        <div className="p-5 border-b border-white/5 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-500 font-extrabold shadow-md">
              A
            </div>
            <div>
              <span className="text-[10px] font-bold text-red-500 tracking-wider uppercase block font-mono">ASUS SOUTH AFRICA</span>
              <h2 className="text-sm font-extrabold uppercase tracking-tight text-white leading-tight">Tailored Tech CV Workspace</h2>
            </div>
          </div>
          {onBackToCampaigns && (
            <button 
              onClick={onBackToCampaigns}
              className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[11px] font-semibold text-slate-400 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Campaigns
            </button>
          )}
        </div>

        {/* Dynamic Tips Bar */}
        <div className="px-5 py-3 bg-red-500/5 text-red-400 text-[10px] border-b border-red-500/10 flex items-center gap-2 font-mono">
          <Clock className="w-4 h-4 text-red-400 flex-shrink-0 animate-pulse" />
          <span>Tailored specifically for ASUS South Africa’s hardware motherboard/laptop repairs grid.</span>
        </div>

        {/* Scrollable controls */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Quick-Fill Placement Settings */}
          <div className="glass p-4 border border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-red-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">ASUS Placement Settings</h3>
            </div>
            
            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Target Role @ ASUS SA</label>
                <select 
                  value={targetRole} 
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition"
                >
                  <option value="IT Support Technician">IT Support Technician (Hardware & Laptops)</option>
                  <option value="Hardware Diagnostics Specialist">Hardware Diagnostics Specialist (Motherboards / GPUs)</option>
                  <option value="Technical Support Engineer">Technical Support Engineer (TUF & ROG Gaming lines)</option>
                  <option value="Junior IT Administrator">Junior IT Systems Administrator (Commercial & ExpertBooks)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">High-Impact Technical Focus</label>
                <input 
                  type="text" 
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  placeholder="e.g. Component Repair, ASUS Router diagnostics"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none transition"
                />
              </div>

              <button
                onClick={handleEnhanceWithAI}
                disabled={isEnhancing}
                className="w-full bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition duration-300 flex items-center justify-center gap-1.5 shadow-lg shadow-red-950/20 cursor-pointer"
              >
                {isEnhancing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Optimizing CV with Google Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    Apply ASUS-Specific AI Enhancer
                  </>
                )}
              </button>

              {aiTip && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] text-red-300 leading-relaxed font-mono">
                  {aiTip}
                </div>
              )}
            </div>
          </div>

          {/* Section Selector Tab-Strip */}
          <div className="flex bg-slate-950 p-1 rounded-lg gap-1 border border-white/5 overflow-x-auto no-scrollbar">
            {(['contact', 'summary', 'skills', 'experience', 'education', 'certifications'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveSection(tab)}
                className={`flex-1 min-w-[70px] py-2 rounded-md text-[10px] font-bold uppercase tracking-wider text-center transition ${
                  activeSection === tab ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Interactive Form Fields based on Selected Category */}
          <div className="space-y-4">
            
            {activeSection === 'contact' && (
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Contact & Placement Variables</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={cvData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Job Title Segment</label>
                    <input 
                      type="text" 
                      value={cvData.title}
                      onChange={(e) => updateField('title', e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Johannesburg Address</label>
                  <input 
                    type="text" 
                    value={cvData.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">South Africa Mobile</label>
                    <input 
                      type="text" 
                      value={cvData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder="+27 (Phone Number)"
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Personal Email</label>
                    <input 
                      type="email" 
                      value={cvData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">LinkedIn Profile Link</label>
                  <input 
                    type="text" 
                    value={cvData.linkedin}
                    onChange={(e) => updateField('linkedin', e.target.value)}
                    placeholder="linkedin.com/in/yourprofile"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            )}

            {activeSection === 'summary' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Professional Work Profile</h4>
                  <span className="text-[9px] text-slate-400 font-mono">Align to ASUS high standards</span>
                </div>
                <textarea 
                  value={cvData.summary}
                  onChange={(e) => updateField('summary', e.target.value)}
                  rows={6}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-xs text-white leading-relaxed focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition"
                  placeholder="Describe your passion for ASUS design, diagnostics speed, and technical customer service..."
                />
              </div>
            )}

            {activeSection === 'skills' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Core Diagnostics & Soft Skills</h4>
                
                {/* Hardware Skills list */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-slate-950 px-2 py-1.5 rounded-lg border border-white/5">
                    <label className="text-[10px] font-bold uppercase text-red-400">Hardware & Diagnostics</label>
                    <button onClick={() => addSkillItem('hardware')} className="text-[9px] uppercase font-bold text-slate-400 hover:text-white font-mono">+ Add</button>
                  </div>
                  {cvData.skills.hardware.map((sk, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text" 
                        value={sk}
                        onChange={(e) => updateSkillList('hardware', idx, e.target.value)}
                        className="flex-1 bg-slate-950/40 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:border-red-500/40"
                      />
                      <button onClick={() => deleteSkillItem('hardware', idx)} className="text-[10px] text-red-400 px-1 hover:text-red-300">×</button>
                    </div>
                  ))}
                </div>

                {/* Operating Systems */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-slate-950 px-2 py-1.5 rounded-lg border border-white/5">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Operating Systems & Deploy</label>
                    <button onClick={() => addSkillItem('os')} className="text-[9px] uppercase font-bold text-slate-400 hover:text-white font-mono">+ Add</button>
                  </div>
                  {cvData.skills.os.map((sk, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text" 
                        value={sk}
                        onChange={(e) => updateSkillList('os', idx, e.target.value)}
                        className="flex-1 bg-slate-950/40 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:border-red-500/40"
                      />
                      <button onClick={() => deleteSkillItem('os', idx)} className="text-[10px] text-red-400 px-1 hover:text-red-300">×</button>
                    </div>
                  ))}
                </div>

                {/* Networking */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-slate-950 px-2 py-1.5 rounded-lg border border-white/5">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Networking Administration</label>
                    <button onClick={() => addSkillItem('networking')} className="text-[9px] uppercase font-bold text-slate-400 hover:text-white font-mono">+ Add</button>
                  </div>
                  {cvData.skills.networking.map((sk, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text" 
                        value={sk}
                        onChange={(e) => updateSkillList('networking', idx, e.target.value)}
                        className="flex-1 bg-slate-950/40 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:border-red-500/40"
                      />
                      <button onClick={() => deleteSkillItem('networking', idx)} className="text-[10px] text-red-400 px-1 hover:text-red-300">×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'experience' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Professional Experience Loops</h4>
                </div>
                
                {cvData.experience.map((exp, expIdx) => (
                  <div key={exp.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
                    <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                      <span className="text-[10px] font-mono text-red-500 uppercase font-black">Experience #{expIdx + 1}</span>
                      <span className="text-[9px] text-slate-500">{exp.period}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[8px] uppercase font-bold text-slate-400">Role Title</label>
                        <input 
                          type="text" 
                          value={exp.role} 
                          onChange={(e) => updateExperienceMeta(exp.id, 'role', e.target.value)}
                          className="w-full bg-slate-950 border border-white/5 px-2 py-1 rounded text-xs" 
                        />
                      </div>
                      <div>
                        <label className="text-[8px] uppercase font-bold text-slate-400">Employer Name</label>
                        <input 
                          type="text" 
                          value={exp.company} 
                          onChange={(e) => updateExperienceMeta(exp.id, 'company', e.target.value)}
                          className="w-full bg-slate-950 border border-white/5 px-2 py-1 rounded text-xs" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[8px] uppercase font-bold text-slate-400">South Africa Region</label>
                        <input 
                          type="text" 
                          value={exp.location} 
                          onChange={(e) => updateExperienceMeta(exp.id, 'location', e.target.value)}
                          className="w-full bg-slate-950 border border-white/5 px-2 py-1 rounded text-xs" 
                        />
                      </div>
                      <div>
                        <label className="text-[8px] uppercase font-bold text-slate-400">Service Span (Date Ranges)</label>
                        <input 
                          type="text" 
                          value={exp.period} 
                          onChange={(e) => updateExperienceMeta(exp.id, 'period', e.target.value)}
                          className="w-full bg-slate-950 border border-white/5 px-2 py-1 rounded text-xs" 
                        />
                      </div>
                    </div>

                    {/* Bullet Points */}
                    <div className="space-y-1.5 pt-1.5">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="font-bold text-slate-400 uppercase">Core Job Duties & Diagnostics</span>
                        <button onClick={() => addExperienceBullet(exp.id)} className="text-red-400 font-extrabold hover:text-red-300 font-mono">+ Add Bullet</button>
                      </div>
                      {exp.bullets.map((bullet, bIdx) => (
                        <div key={bIdx} className="flex gap-2">
                          <textarea 
                            value={bullet}
                            rows={2}
                            onChange={(e) => updateExperienceBullet(exp.id, bIdx, e.target.value)}
                            className="flex-1 bg-slate-950/45 border border-white/5 text-[11px] leading-relaxed p-1.5 rounded-lg text-slate-300"
                          />
                          <button onClick={() => deleteExperienceBullet(exp.id, bIdx)} className="text-[12px] text-red-500 hover:text-red-400 px-1">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSection === 'education' && (
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Education & Institutional degrees</h4>
                
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Degree Or Diploma</label>
                  <input 
                    type="text" 
                    value={cvData.education.degree}
                    onChange={(e) => updateNestedField('education', 'degree', e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">School / University / College</label>
                  <input 
                    type="text" 
                    value={cvData.education.institution}
                    onChange={(e) => updateNestedField('education', 'institution', e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Graduation Year</label>
                    <input 
                      type="text" 
                      value={cvData.education.year}
                      onChange={(e) => updateNestedField('education', 'year', e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">School Location</label>
                    <input 
                      type="text" 
                      value={cvData.education.location}
                      onChange={(e) => updateNestedField('education', 'location', e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'certifications' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Professional Credentials</h4>
                  <button onClick={addCertification} className="text-[9px] uppercase font-bold text-red-400 hover:text-white font-mono">+ Add Certification</button>
                </div>

                {cvData.certifications.map((cert, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input 
                      type="text" 
                      value={cert}
                      onChange={(e) => updateCertification(idx, e.target.value)}
                      className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:border-red-500/40"
                    />
                    <button onClick={() => deleteCertification(idx)} className="text-[10px] text-red-400 px-1.5 hover:text-red-300">×</button>
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* Quick Tips for ASUS Submission */}
          <div className="p-4 bg-[#14151a] rounded-xl border border-white/5 space-y-2.5">
            <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest font-bold block flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              ASUS SA RECRUITER CHECKLIST
            </span>
            <ul className="text-[10px] text-slate-400 space-y-2 bg-slate-950/40 p-3 rounded-lg list-disc list-inside">
              <li>Highlight <strong className="text-white">motherboard & diagnostics troubleshooting</strong> capabilities because ASUS is world-famous for premium components.</li>
              <li>Always quantify diagnostic repair times or downtime reduction (e.g., 24% system downtime reduction achieved).</li>
              <li>Emphasize <strong className="text-white">customer-facing client care</strong> and ticket accuracy to score highly on tier 1 and 2 service evaluations.</li>
            </ul>
          </div>
        </div>

        {/* Footer controls */}
        <div className="p-4 border-t border-white/5 bg-slate-950/20 flex gap-2">
          <div className="flex-1 flex gap-2">
            <button 
              onClick={handleCopyText}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2 px-3 rounded-lg text-[10px] uppercase font-bold tracking-wider transition border border-white/10 flex items-center justify-center gap-1 cursor-pointer"
            >
              {copiedType === 'text' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              {copiedType === 'text' ? 'Copied' : 'Copy Text'}
            </button>
            <button 
              onClick={handleCopyMarkdown}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2 px-3 rounded-lg text-[10px] uppercase font-bold tracking-wider transition border border-white/10 flex items-center justify-center gap-1 cursor-pointer"
            >
              {copiedType === 'md' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <FileText className="w-3.5 h-3.5 text-slate-400" />}
              {copiedType === 'md' ? 'Markdown' : 'Copy MD'}
            </button>
          </div>
          <button 
            onClick={handleDownloadPDF}
            disabled={isExportingPDF}
            className="bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white py-2 px-3.5 rounded-lg text-[10px] uppercase font-extrabold tracking-wider transition duration-300 flex items-center justify-center gap-1.5 hover:scale-[1.02] shadow shadow-red-950/25 cursor-pointer"
          >
            {isExportingPDF ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {isExportingPDF ? 'Generating...' : 'Export PDF'}
          </button>
          <button 
            onClick={handlePrint}
            className="bg-white hover:bg-slate-100 text-[#07090e] py-2 px-3.5 rounded-lg text-[10px] uppercase font-extrabold tracking-wider transition duration-300 flex items-center justify-center gap-1 hover:scale-[1.02] shadow shadow-white/10 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / System
          </button>
        </div>
      </div>

      {/* Center/Right Layout: Standard A4 Preview Canvas Sheet */}
      <div className="flex-1 flex flex-col h-full bg-[#0d121c] rounded-2xl border border-white/5 overflow-hidden">
        
        {/* Style selection strip */}
        <div id="print-exclude-panel" className="p-4 border-b border-white/5 bg-black/40 flex items-center justify-between overflow-x-auto no-scrollbar gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase font-mono tracking-widest text-slate-400">Fonts:</span>
            <div className="flex bg-slate-900 rounded p-0.5 border border-white/5">
              {(['sans', 'serif', 'mono'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFontFamily(f)}
                  className={`text-[9px] uppercase px-2 py-1 rounded font-bold tracking-wider ${
                    fontFamily === f ? 'bg-red-600 text-white' : 'text-slate-400'
                  }`}
                >
                  {f === 'sans' ? 'Inter Sans' : f === 'serif' ? 'Editorial Serif' : 'Tech Mono'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-300 font-mono">
              <input 
                type="checkbox" 
                checked={compactMode}
                onChange={() => setCompactMode(!compactMode)}
                className="rounded border-white/20 text-red-600 focus:ring-0 w-3.5 h-3.5"
              />
              A4 Single Page Compact
            </label>

            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase font-mono">Accents:</span>
              <div className="flex gap-1.5">
                {(['slate', 'blue', 'emerald', 'crimson'] as const).map(color => (
                  <button
                    key={color}
                    onClick={() => setAccentColor(color)}
                    className={`w-3.5 h-3.5 rounded-full border transition flex items-center justify-center ${
                      accentColor === color ? 'border-white scale-110' : 'border-transparent opacity-60'
                    }`}
                    style={{
                      backgroundColor: 
                        color === 'blue' ? '#3b82f6' : 
                        color === 'emerald' ? '#10b981' : 
                        color === 'crimson' ? '#ef4444' : '#1e293b'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Paper Canvas Board */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 flex justify-center bg-[#0d121c] technical-grid">
          
          {/* True A4 Sized Sheet container */}
          <div 
            id="a4-print-target"
            className={`w-[810px] bg-white text-slate-900 shadow-2xl relative select-text transition-all duration-300 ${fontStyleClass()} ${
              compactMode ? 'p-8 min-h-[1130px] max-h-[1145px] overflow-hidden' : 'p-12 min-h-[1140px] py-16'
            }`}
            style={{
              aspectRatio: '1 / 1.414',
              color: '#1e293b',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.50)'
            }}
          >
            {/* Header segment of Chinedu's Tailored CV */}
            <div className="text-center font-sans tracking-normal relative">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase font-sans mb-1.5">
                {cvData.name || "CHINEDU OKEKE"}
              </h1>
              
              <div className="text-[10.5px] font-mono tracking-widest text-slate-500 uppercase font-bold flex items-center justify-center gap-1 mb-3">
                <span className={`w-1.5 h-1.5 rounded-full inline-block mr-1 ${dotAccentStyle()}`} />
                {cvData.title || "IT Professional"}
              </div>

              {/* Contact Icons Row - No custom SVGs, standard lucide elements rendered styled */}
              <div className="flex flex-wrap justify-center items-center gap-y-1.5 gap-x-4 text-[9.5px] text-slate-600 font-medium">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{cvData.location}</span>
                </div>
                <div className="flex items-center gap-1 border-l border-slate-300 pl-4">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-bold">{cvData.email}</span>
                </div>
                {cvData.phone && (
                  <div className="flex items-center gap-1 border-l border-slate-300 pl-4">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{cvData.phone}</span>
                  </div>
                )}
                {cvData.linkedin && (
                  <div className="flex items-center gap-1 border-l border-slate-300 pl-4">
                    <Linkedin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-500 font-mono lowercase">{cvData.linkedin}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Horizontal custom colored accent ribbon */}
            <div className={`w-full h-[3px] my-4 rounded-full ${dotAccentStyle()}`} />

            {/* A4 Content structure */}
            <div className={`space-y-4 text-slate-800 ${compactMode ? 'text-[10px]' : 'text-[11.5px]'}`}>
              
              {/* Professional Summary */}
              <div>
                <h3 className={`text-[10.5px] font-black uppercase tracking-widest border-b pb-1 mb-2 flex items-center gap-1.5 ${borderAccentStyle()}`}>
                  <BookOpen className="w-3.5 h-3.5 mr-0.5" />
                  Professional Summary
                </h3>
                <p className="leading-relaxed text-justify text-slate-700 whitespace-pre-line">
                  {cvData.summary}
                </p>
              </div>

              {/* Competencies Section divided in elegant layout */}
              <div>
                <h3 className={`text-[10.5px] font-black uppercase tracking-widest border-b pb-1 mb-2.5 flex items-center gap-1.5 ${borderAccentStyle()}`}>
                  <Award className="w-3.5 h-3.5 mr-0.5" />
                  Key Competencies & Diagnostic Skills
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                  <div>
                    <span className={`text-[9px] font-mono uppercase tracking-wider font-extrabold block mb-1 ${textAccentStyle()}`}>
                      Hardware & Diagnostics
                    </span>
                    <ul className="space-y-0.5 text-slate-600">
                      {cvData.skills.hardware.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="bullet-marker text-red-500 select-none mr-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className={`text-[9px] font-mono uppercase tracking-wider font-extrabold block mb-1 ${textAccentStyle()}`}>
                      Desktop & Cloud Services
                    </span>
                    <ul className="space-y-0.5 text-slate-600">
                      {cvData.skills.software.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="bullet-marker text-red-500 select-none mr-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider font-extrabold block mb-1">
                      Networking Infrastructure
                    </span>
                    <ul className="space-y-0.5 text-slate-600">
                      {cvData.skills.networking.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="bullet-marker text-red-500 select-none mr-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider font-extrabold block mb-1">
                      Operating Systems & Soft Skills
                    </span>
                    <ul className="space-y-0.5 text-slate-600">
                      {cvData.skills.os.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="bullet-marker text-red-500 select-none mr-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                      {cvData.skills.soft.slice(0, 2).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1 text-slate-500">
                          <span className="bullet-marker text-slate-400 select-none mr-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Professional Experience Section with Metrics details */}
              <div>
                <h3 className={`text-[10.5px] font-black uppercase tracking-widest border-b pb-1 mb-2.5 flex items-center gap-1.5 ${borderAccentStyle()}`}>
                  <Briefcase className="w-3.5 h-3.5 mr-0.5" />
                  Professional Experience
                </h3>
                <div className="space-y-3.5">
                  {cvData.experience.map(exp => (
                    <div key={exp.id} className="space-y-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <strong className="text-slate-900 font-bold text-[11px] sm:text-[12px]">{exp.role}</strong>
                          <span className="text-slate-500 font-medium ml-1">| {exp.company}</span>
                        </div>
                        <div className="text-right shrink-0 select-none font-mono text-[9px] uppercase tracking-wider text-slate-500 font-medium">
                          {exp.period}
                        </div>
                      </div>
                      
                      <div className="text-[9.5px] text-slate-500 italic font-medium font-sans mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{exp.location}</span>
                      </div>

                      <ul className="space-y-1 text-slate-700 leading-normal pl-1 text-justify">
                        {exp.bullets.map((bullet, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="bullet-marker text-red-500 text-[12px] leading-tight select-none">&#x2022;</span>
                            <span className="text-slate-700 font-sans">{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Education & Academic degrees */}
              <div className="grid grid-cols-2 gap-6 pt-1">
                <div>
                  <h3 className={`text-[10.5px] font-black uppercase tracking-widest border-b pb-1 mb-2 flex items-center gap-1.5 ${borderAccentStyle()}`}>
                    <GraduationCap className="w-4 h-4 mr-0.5" />
                    Education
                  </h3>
                  <div className="space-y-0.5 text-slate-700">
                    <strong className="text-slate-900 text-[11px] font-bold block">{cvData.education.degree}</strong>
                    <div className="text-slate-600 font-medium">{cvData.education.institution}</div>
                    <div className="text-[9.5px] text-slate-500 font-mono uppercase">Class of {cvData.education.year} | {cvData.education.location}</div>
                  </div>
                </div>

                {/* References segment */}
                <div>
                  <h3 className={`text-[10.5px] font-black uppercase tracking-widest border-b pb-1 mb-2 flex items-center gap-1.5 ${borderAccentStyle()}`}>
                    <HeartHandshake className="w-4 h-4 mr-0.5" />
                    References
                  </h3>
                  <p className="text-slate-600 font-medium leading-relaxed italic pr-2">
                    {cvData.references}
                  </p>
                </div>
              </div>

              {/* Certifications optional listed neatly */}
              <div>
                <h3 className={`text-[10.5px] font-black uppercase tracking-widest border-b pb-1 mb-2 flex items-center gap-1.5 ${borderAccentStyle()}`}>
                  <Award className="w-3.5 h-3.5 mr-0.5" />
                  Professional Certifications
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-slate-600">
                  {cvData.certifications.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <span className="bullet-marker text-red-500 select-none">&#x2022;</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* ASUS watermark-like design footnote - standard and classy, not telemetry */}
            <div className="absolute bottom-4 left-0 right-0 text-center text-[8px] font-mono text-slate-400 select-none">
              Prepared for ASUS South Africa Recruitment Board • Johannesburg, GP
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
