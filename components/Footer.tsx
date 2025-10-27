import React from 'react';
import { CallIcon } from './Icons';

const Footer: React.FC = () => {
    return (
        <footer className="bg-gray-200 text-gray-700 text-sm text-center p-4 mt-auto no-print">
            <p className="font-semibold text-gray-800">Rguzone Software Solutions</p>
            <div className="flex items-center justify-center mt-1">
                <CallIcon className="w-4 h-4 mr-2" />
                <p> Dr. Angelo C. Arguson</p>
            </div>
        </footer>
    );
};

export default Footer;

