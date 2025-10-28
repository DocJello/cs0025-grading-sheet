
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserRole, GradeSheet, Page, GradeSheetStatus, PanelGrades, Student } from '../types';
import { TITLE_DEFENSE_RUBRIC, INDIVIDUAL_GRADE_RUBRIC } from '../constants';

const getStatusColor = (status: GradeSheetStatus) => {
    switch (status) {
        case GradeSheetStatus.COMPLETED:
            return 'bg-green-100 text-green-800';
        case GradeSheetStatus.NOT_STARTED:
            return 'bg-gray-100 text-gray-800';
        case GradeSheetStatus.IN_PROGRESS:
        case GradeSheetStatus.PANEL_1_SUBMITTED:
        case GradeSheetStatus.PANEL_2_SUBMITTED:
            return 'bg-yellow-100 text-yellow-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

const calculatePanelScores = (grades: PanelGrades | undefined, proponents: Student[]) => {
    if (!grades) {
        return {
            titleDefenseWeighted: 0,
            individualWeighted: proponents.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {})
        };
    }
    const totalTdWeight = TITLE_DEFENSE_RUBRIC.reduce((sum, item) => sum + item.weight, 0);
    const totalIgWeight = INDIVIDUAL_GRADE_RUBRIC.reduce((sum, item) => sum + item.weight, 0);

    const tdRaw = TITLE_DEFENSE_RUBRIC.reduce((sum, item) => sum + (grades.titleDefenseScores[item.id] || 0), 0);
    const titleDefenseWeighted = (tdRaw / totalTdWeight) * 70;

    const individualWeighted = proponents.reduce((acc, p) => {
        const igRaw = INDIVIDUAL_GRADE_RUBRIC.reduce((sum, item) => sum + (grades.individualScores[p.id]?.[item.id] || 0), 0);
        acc[p.id] = (igRaw / totalIgWeight) * 30;
        return acc;
    }, {} as {[key: string]: number});
    
    return { titleDefenseWeighted, individualWeighted };
};


const GradeSheetCard: React.FC<{ sheet: GradeSheet, onView: () => void }> = ({ sheet, onView }) => {
    const { findUserById } = useAppContext();

    const finalRemark = useMemo(() => {
        if (sheet.status !== GradeSheetStatus.COMPLETED) return null;

        const panel1Scores = calculatePanelScores(sheet.panel1Grades, sheet.proponents);
        const panel2Scores = calculatePanelScores(sheet.panel2Grades, sheet.proponents);
        
        const studentScores = sheet.proponents.map(proponent => {
            const p1Indiv = panel1Scores.individualWeighted[proponent.id] || 0;
            const p2Indiv = panel2Scores.individualWeighted[proponent.id] || 0;
            const p1Total = panel1Scores.titleDefenseWeighted + p1Indiv;
            const p2Total = panel2Scores.titleDefenseWeighted + p2Indiv;
            const finalScore = (p1Total + p2Total) / 2;
            return { finalScore };
        });
        
        const groupFinalScore = studentScores.reduce((sum, s) => sum + s.finalScore, 0) / (studentScores.length || 1);

        return groupFinalScore < 70 ? 'Failed' : 'Passed';
    }, [sheet]);

    const getRemarkColor = (remark: string | null) => {
        if (remark === 'Passed') return 'bg-green-100 text-green-800';
        if (remark === 'Failed') return 'bg-red-100 text-red-800';
        return '';
    };

    return (
        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
            <div className="p-5">
                <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-gray-800">{sheet.groupName}</h3>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                         {finalRemark && (
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRemarkColor(finalRemark)}`}>
                                {finalRemark}
                            </span>
                        )}
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sheet.status)}`}>
                            {sheet.status}
                        </span>
                    </div>
                </div>
                <p className="text-base text-gray-800 mt-1 truncate">{sheet.selectedTitle}</p>
                <div className="mt-4 text-sm text-gray-700">
                    <p><strong>Panel 1:</strong> {findUserById(sheet.panel1Id)?.name || 'N/A'}</p>
                    <p><strong>Panel 2:</strong> {findUserById(sheet.panel2Id)?.name || 'N/A'}</p>
                </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
                <button
                    onClick={onView}
                    className="w-full text-sm font-medium text-green-700 hover:text-green-800 transition-colors"
                >
                    View Details
                </button>
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ navigateToGradeSheet }) => {
    const { currentUser, gradeSheets, getPanelSheets, findUserById } = useAppContext();
    const [filter, setFilter] = useState<string>('All');

    if (!currentUser) return null;

    const handleViewSheet = (id: string) => {
        navigateToGradeSheet(id);
    };

    const isAdminOrAdviser = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.COURSE_ADVISER;
    
    const allSheets = isAdminOrAdviser ? gradeSheets : getPanelSheets(currentUser.id);

    const displaySheets = allSheets.filter(sheet => {
        if (!isAdminOrAdviser || filter === 'All') return true;
        if (filter === 'Completed') return sheet.status === GradeSheetStatus.COMPLETED;
        if (filter === 'Not Started') return sheet.status === GradeSheetStatus.NOT_STARTED;
        if (filter === 'In Progress') {
            return [
                GradeSheetStatus.IN_PROGRESS,
                GradeSheetStatus.PANEL_1_SUBMITTED,
                GradeSheetStatus.PANEL_2_SUBMITTED
            ].includes(sheet.status);
        }
        return true;
    });

    const getPanelStatus = (panelGrades: PanelGrades | undefined): 'Not Started' | 'In Progress' | 'Completed' => {
        if (!panelGrades) return 'Not Started';
        if (panelGrades.submitted) return 'Completed';
    
        const hasTitleScores = Object.keys(panelGrades.titleDefenseScores).length > 0;
        const hasIndividualScores = Object.values(panelGrades.individualScores).some(scores => Object.keys(scores).length > 0);
        const hasComments = !!panelGrades.comments?.trim();
    
        if (hasTitleScores || hasIndividualScores || hasComments) {
            return 'In Progress';
        }
        return 'Not Started';
    };

    const handleExportWord = () => {
        let tableHtml = `
            <table border="1" style="border-collapse: collapse; width: 100%; font-family: sans-serif;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="padding: 8px;">Groupname</th>
                        <th style="padding: 8px;">Panel 1</th>
                        <th style="padding: 8px;">Status</th>
                        <th style="padding: 8px;">Panel 2</th>
                        <th style="padding: 8px;">Status</th>
                    </tr>
                </thead>
                <tbody>
        `;
        displaySheets.forEach(sheet => {
            const panel1Name = findUserById(sheet.panel1Id)?.name || 'N/A';
            const panel2Name = findUserById(sheet.panel2Id)?.name || 'N/A';
            const panel1Status = getPanelStatus(sheet.panel1Grades);
            const panel2Status = getPanelStatus(sheet.panel2Grades);

            tableHtml += `
                <tr>
                    <td style="padding: 8px;">${sheet.groupName}</td>
                    <td style="padding: 8px;">${panel1Name}</td>
                    <td style="padding: 8px;">${panel1Status}</td>
                    <td style="padding: 8px;">${panel2Name}</td>
                    <td style="padding: 8px;">${panel2Status}</td>
                </tr>
            `;
        });
        tableHtml += `</tbody></table>`;
        
        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' "+
        "xmlns:w='urn:schemas-microsoft-com:office:word' "+
        "xmlns='http://www.w3.org/TR/REC-html40'>"+
        "<head><meta charset='utf-8'><title>Dashboard Export</title></head><body>";
        const footer = "</body></html>";
        const sourceHTML = header + `<h1>Dashboard</h1>` + tableHtml + footer;

        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = 'dashboard-export.doc';
        fileDownload.click();
        document.body.removeChild(fileDownload);
    };

    const handleExportCsv = () => {
        const headers = ['Groupname', 'Panel 1', 'Status', 'Panel 2', 'Status'];
        
        const csvRows = [headers.join(',')]; // Add header row

        displaySheets.forEach(sheet => {
            const panel1Name = findUserById(sheet.panel1Id)?.name || 'N/A';
            const panel2Name = findUserById(sheet.panel2Id)?.name || 'N/A';
            const panel1Status = getPanelStatus(sheet.panel1Grades);
            const panel2Status = getPanelStatus(sheet.panel2Grades);

            // Escape commas in names if any by wrapping in quotes
            const row = [
                `"${sheet.groupName.replace(/"/g, '""')}"`,
                `"${panel1Name.replace(/"/g, '""')}"`,
                `"${panel1Status}"`,
                `"${panel2Name.replace(/"/g, '""')}"`,
                `"${panel2Status}"`,
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'dashboard-export.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
                <div className="flex space-x-2 no-print self-start sm:self-auto">
                     <button onClick={handleExportWord} className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-sm">Export to MS Word</button>
                     <button onClick={handleExportCsv} className="px-4 py-2 text-sm font-medium rounded-md bg-green-700 text-white hover:bg-green-800 shadow-sm">Export to CSV</button>
                </div>
            </div>
            
            {isAdminOrAdviser && (
                <div className="mb-6 flex flex-wrap gap-2 no-print">
                    {['All', 'Not Started', 'In Progress', 'Completed'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors shadow-sm ${
                                filter === f
                                    ? 'bg-green-700 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 border'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 no-print">
                {displaySheets.length > 0 ? (
                    displaySheets.map(sheet => (
                        <GradeSheetCard key={sheet.id} sheet={sheet} onView={() => handleViewSheet(sheet.id)} />
                    ))
                ) : (
                    <p className="text-gray-500 col-span-full">No grading sheets found for the selected filter.</p>
                )}
            </div>

            {/* Print-only table */}
            <div className="print-only">
                <h2 className="text-2xl font-bold mb-4">Dashboard Summary</h2>
                <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-800">Groupname</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-800">Panel 1</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-800">Status</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-800">Panel 2</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-800">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {displaySheets.map(sheet => (
                            <tr key={sheet.id}>
                                <td className="px-4 py-2">{sheet.groupName}</td>
                                <td className="px-4 py-2">{findUserById(sheet.panel1Id)?.name || 'N/A'}</td>
                                <td className="px-4 py-2">{getPanelStatus(sheet.panel1Grades)}</td>
                                <td className="px-4 py-2">{findUserById(sheet.panel2Id)?.name || 'N/A'}</td>
                                <td className="px-4 py-2">{getPanelStatus(sheet.panel2Grades)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

interface DashboardProps {
    navigateToGradeSheet: (id: string) => void;
}

export default Dashboard;
