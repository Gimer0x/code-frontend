'use client'

import { useState } from 'react'
import SolidityEditor from '@/components/SolidityEditor'

export default function TestSolidityPage() {
  const [code, setCode] = useState(`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor () ERC20("MyToken", "MTK") {}

    function mint(address to, uint256 amount) public {
        require(amount > 0, "Amount must be greater than 0");
        _mint(to, amount);
    }

    function decimals() public pure override returns(uint8) {
        return 6;
    }

    function internalFunction() internal {
        // Internal function example
    }

    function externalFunction() external {
        // External function example
    }

    function withdraw(uint256 amount) public {
        require(amount > 0, "Amount must be greater than 0");
        if (amount > 1000) {
            revert("Amount too large");
        }
    }

    function getBlockInfo() public view returns (uint256, address, uint256) {
        return (block.timestamp, msg.sender, block.number);
    }

    function checkGas() public view returns (uint256) {
        return gasleft();
    }

    function testGlobals() public view {
        uint256 timestamp = block.timestamp;
        address sender = msg.sender;
        uint256 gas = gasleft();
    }
}`)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">Solidity Editor Test</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Test Solidity Code</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              This page tests the Solidity editor with syntax highlighting and dynamic resizing. 
              The words <strong>"contract"</strong>, <strong>"is"</strong>, <strong>"ERC20"</strong>, 
              <strong>"uint256"</strong>, <strong>"address"</strong>, <strong>"bool"</strong>,
              <strong>"internal"</strong>, and <strong>"external"</strong> should be blue.
              The words <strong>"require"</strong> and <strong>"revert"</strong> should be red.
              The global properties <strong>"block.timestamp"</strong>, <strong>"msg.sender"</strong>, 
              <strong>"block.number"</strong>, and <strong>"gasleft"</strong> should be light blue.
            </p>
          </div>
          <div className="h-96">
            <SolidityEditor
              value={code}
              onChange={setCode}
              height="100%"
              className="h-full"
            />
          </div>
        </div>

        <div className="mt-8 bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">Expected Behavior:</h3>
          <ul className="text-blue-700 dark:text-blue-300 space-y-1">
            <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">contract</code> should be blue</li>
            <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">is</code> should be blue</li>
            <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">ERC20</code> should be blue</li>
            <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">uint256</code> should be blue</li>
            <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">address</code> should be blue</li>
            <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">bool</code> should be blue</li>
            <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">internal</code> should be blue</li>
            <li>• <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">external</code> should be blue</li>
            <li>• <code className="bg-red-100 dark:bg-red-800 px-1 rounded text-red-600 dark:text-red-400">require</code> should be red</li>
            <li>• <code className="bg-red-100 dark:bg-red-800 px-1 rounded text-red-600 dark:text-red-400">revert</code> should be red</li>
            <li>• <code className="bg-sky-100 dark:bg-sky-800 px-1 rounded text-sky-600 dark:text-sky-400">block.timestamp</code> should be light blue</li>
            <li>• <code className="bg-sky-100 dark:bg-sky-800 px-1 rounded text-sky-600 dark:text-sky-400">msg.sender</code> should be light blue</li>
            <li>• <code className="bg-sky-100 dark:bg-sky-800 px-1 rounded text-sky-600 dark:text-sky-400">block.number</code> should be light blue</li>
            <li>• <code className="bg-sky-100 dark:bg-sky-800 px-1 rounded text-sky-600 dark:text-sky-400">gasleft</code> should be light blue</li>
          </ul>
        </div>

        <div className="mt-4 bg-green-50 dark:bg-green-900 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">Dynamic Resizing:</h3>
          <ul className="text-green-700 dark:text-green-300 space-y-1">
            <li>• Editor automatically resizes when browser window changes</li>
            <li>• Editor responds to container size changes</li>
            <li>• Resize functionality works without affecting syntax highlighting</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
