/**
 * Template Manager
 * Comprehensive system for managing course templates
 */

import { promises as fs } from 'fs'
import path from 'path'

export interface TemplateFile {
  path: string
  content: string
  description?: string
}

export interface CourseTemplate {
  id: string
  name: string
  description: string
  category: 'basic' | 'advanced' | 'defi' | 'nft' | 'dao' | 'custom'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  language: 'solidity' | 'javascript' | 'typescript'
  files: TemplateFile[]
  dependencies: Array<{
    name: string
    version: string
    source: 'github' | 'npm' | 'git'
  }>
  foundryConfig: {
    solc: string
    optimizer: boolean
    optimizerRuns: number
    viaIR?: boolean
    evmVersion?: string
  }
  remappings: Record<string, string>
  metadata: {
    author?: string
    version: string
    tags: string[]
    estimatedTime?: string
    prerequisites?: string[]
  }
}

export class TemplateManager {
  private templatesPath: string
  private templates: Map<string, CourseTemplate> = new Map()

  constructor(templatesPath: string = './templates') {
    this.templatesPath = templatesPath
  }

  /**
   * Initialize template manager and load templates
   */
  async initialize(): Promise<void> {
    try {
      await this.loadTemplates()
      console.log(`✅ Template manager initialized with ${this.templates.size} templates`)
    } catch (error) {
      console.error('❌ Failed to initialize template manager:', error)
      throw error
    }
  }

  /**
   * Load all templates from the templates directory
   */
  private async loadTemplates(): Promise<void> {
    try {
      // Create templates directory if it doesn't exist
      await fs.mkdir(this.templatesPath, { recursive: true })

      // Load built-in templates
      await this.loadBuiltInTemplates()
    } catch (error) {
      console.error('Error loading templates:', error)
      throw error
    }
  }

  /**
   * Load built-in templates
   */
  private async loadBuiltInTemplates(): Promise<void> {
    // Basic Solidity Template
    const basicTemplate: CourseTemplate = {
      id: 'solidity-basic',
      name: 'Basic Solidity Course',
      description: 'A comprehensive introduction to Solidity programming with hands-on exercises',
      category: 'basic',
      difficulty: 'beginner',
      language: 'solidity',
      files: [
        {
          path: 'src/HelloWorld.sol',
          content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract HelloWorld {
    string public message;
    
    constructor(string memory _message) {
        message = _message;
    }
    
    function setMessage(string memory _newMessage) public {
        message = _newMessage;
    }
    
    function getMessage() public view returns (string memory) {
        return message;
    }
}`
        },
        {
          path: 'test/HelloWorld.t.sol',
          content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/HelloWorld.sol";

contract HelloWorldTest is Test {
    HelloWorld public helloWorld;
    
    function setUp() public {
        helloWorld = new HelloWorld("Hello, World!");
    }
    
    function testGetMessage() public {
        assertEq(helloWorld.getMessage(), "Hello, World!");
    }
    
    function testSetMessage() public {
        helloWorld.setMessage("Hello, Solidity!");
        assertEq(helloWorld.getMessage(), "Hello, Solidity!");
    }
}`
        },
        {
          path: 'README.md',
          content: `# Basic Solidity Course

## Overview
This course introduces you to the fundamentals of Solidity programming.

## Learning Objectives
- Understand Solidity syntax and structure
- Learn about state variables and functions
- Practice with basic contract interactions
- Write and run tests

## Course Structure
1. **Introduction to Solidity**
   - Basic syntax
   - Data types
   - Functions and modifiers

2. **Contract Development**
   - State variables
   - Constructor
   - Public and private functions

3. **Testing**
   - Writing unit tests
   - Using Foundry testing framework
   - Assertions and expectations

## Getting Started
1. Install dependencies: \`forge install\`
2. Compile contracts: \`forge build\`
3. Run tests: \`forge test\`

## Exercises
- Modify the HelloWorld contract
- Add new functions
- Write additional tests
- Deploy and interact with contracts`
        }
      ],
      dependencies: [
        { name: 'forge-std', version: 'latest', source: 'github' }
      ],
      foundryConfig: {
        solc: '0.8.19',
        optimizer: true,
        optimizerRuns: 200,
        viaIR: false,
        evmVersion: 'london'
      },
      remappings: {
        'forge-std/': 'lib/forge-std/src/'
      },
      metadata: {
        author: 'DappDojo Team',
        version: '1.0.0',
        tags: ['solidity', 'beginner', 'basics', 'hello-world'],
        estimatedTime: '2-3 hours',
        prerequisites: ['Basic programming knowledge']
      }
    }

    // Advanced Solidity Template
    const advancedTemplate: CourseTemplate = {
      id: 'solidity-advanced',
      name: 'Advanced Solidity Course',
      description: 'Advanced Solidity concepts including gas optimization, security patterns, and complex contract interactions',
      category: 'advanced',
      difficulty: 'advanced',
      language: 'solidity',
      files: [
        {
          path: 'src/AdvancedContract.sol',
          content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract AdvancedContract is ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _itemIds;
    
    struct Item {
        uint256 id;
        address owner;
        string name;
        uint256 price;
        bool forSale;
    }
    
    mapping(uint256 => Item) public items;
    mapping(address => uint256[]) public userItems;
    
    event ItemCreated(uint256 indexed itemId, address indexed owner, string name, uint256 price);
    event ItemSold(uint256 indexed itemId, address indexed buyer, uint256 price);
    
    modifier itemExists(uint256 _itemId) {
        require(_itemId > 0 && _itemId <= _itemIds.current(), "Item does not exist");
        _;
    }
    
    function createItem(string memory _name, uint256 _price) external {
        _itemIds.increment();
        uint256 newItemId = _itemIds.current();
        
        items[newItemId] = Item({
            id: newItemId,
            owner: msg.sender,
            name: _name,
            price: _price,
            forSale: true
        });
        
        userItems[msg.sender].push(newItemId);
        
        emit ItemCreated(newItemId, msg.sender, _name, _price);
    }
    
    function buyItem(uint256 _itemId) external payable nonReentrant itemExists(_itemId) {
        Item storage item = items[_itemId];
        require(item.forSale, "Item is not for sale");
        require(msg.value >= item.price, "Insufficient payment");
        require(item.owner != msg.sender, "Cannot buy your own item");
        
        // Transfer ownership
        address previousOwner = item.owner;
        item.owner = msg.sender;
        item.forSale = false;
        
        // Update user items
        _removeItemFromUser(previousOwner, _itemId);
        userItems[msg.sender].push(_itemId);
        
        // Transfer payment
        payable(previousOwner).transfer(item.price);
        
        // Refund excess payment
        if (msg.value > item.price) {
            payable(msg.sender).transfer(msg.value - item.price);
        }
        
        emit ItemSold(_itemId, msg.sender, item.price);
    }
    
    function _removeItemFromUser(address _user, uint256 _itemId) private {
        uint256[] storage userItemsList = userItems[_user];
        for (uint256 i = 0; i < userItemsList.length; i++) {
            if (userItemsList[i] == _itemId) {
                userItemsList[i] = userItemsList[userItemsList.length - 1];
                userItemsList.pop();
                break;
            }
        }
    }
    
    function getUserItems(address _user) external view returns (uint256[] memory) {
        return userItems[_user];
    }
    
    function getItem(uint256 _itemId) external view itemExists(_itemId) returns (Item memory) {
        return items[_itemId];
    }
}`
        },
        {
          path: 'test/AdvancedContract.t.sol',
          content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/AdvancedContract.sol";

contract AdvancedContractTest is Test {
    AdvancedContract public advancedContract;
    
    address public owner = address(0x1);
    address public buyer = address(0x2);
    address public seller = address(0x3);
    
    function setUp() public {
        vm.startPrank(owner);
        advancedContract = new AdvancedContract();
        vm.stopPrank();
        
        // Fund accounts
        vm.deal(buyer, 10 ether);
        vm.deal(seller, 10 ether);
    }
    
    function testCreateItem() public {
        vm.startPrank(seller);
        advancedContract.createItem("Test Item", 1 ether);
        vm.stopPrank();
        
        AdvancedContract.Item memory item = advancedContract.getItem(1);
        assertEq(item.owner, seller);
        assertEq(item.name, "Test Item");
        assertEq(item.price, 1 ether);
        assertTrue(item.forSale);
    }
    
    function testBuyItem() public {
        // Create item
        vm.startPrank(seller);
        advancedContract.createItem("Test Item", 1 ether);
        vm.stopPrank();
        
        // Buy item
        vm.startPrank(buyer);
        advancedContract.buyItem{value: 1 ether}(1);
        vm.stopPrank();
        
        AdvancedContract.Item memory item = advancedContract.getItem(1);
        assertEq(item.owner, buyer);
        assertFalse(item.forSale);
    }
    
    function testReentrancyProtection() public {
        // This test would require a malicious contract to test reentrancy
        // Implementation would depend on specific attack vectors
    }
    
    function testOnlyOwnerFunctions() public {
        vm.startPrank(buyer);
        vm.expectRevert();
        advancedContract.transferOwnership(buyer);
        vm.stopPrank();
    }
}`
        },
        {
          path: 'README.md',
          content: `# Advanced Solidity Course

## Overview
This course covers advanced Solidity concepts including security patterns, gas optimization, and complex contract interactions.

## Learning Objectives
- Understand advanced Solidity patterns
- Learn security best practices
- Implement gas optimization techniques
- Work with complex contract interactions
- Master testing strategies

## Course Structure
1. **Security Patterns**
   - Reentrancy protection
   - Access control
   - Input validation
   - State management

2. **Gas Optimization**
   - Storage optimization
   - Function optimization
   - Loop optimization
   - Assembly usage

3. **Advanced Testing**
   - Fuzz testing
   - Invariant testing
   - Integration testing
   - Security testing

4. **Complex Interactions**
   - Multi-contract systems
   - Event handling
   - Error management
   - Upgrade patterns

## Prerequisites
- Basic Solidity knowledge
- Understanding of smart contract security
- Experience with testing frameworks

## Getting Started
1. Install dependencies: \`forge install\`
2. Compile contracts: \`forge build\`
3. Run tests: \`forge test\`
4. Run fuzz tests: \`forge test --fuzz\`

## Advanced Exercises
- Implement upgradeable contracts
- Create gas-optimized functions
- Build multi-signature wallets
- Develop complex DeFi protocols`
        }
      ],
      dependencies: [
        { name: 'forge-std', version: 'latest', source: 'github' },
        { name: 'openzeppelin-contracts', version: 'latest', source: 'github' }
      ],
      foundryConfig: {
        solc: '0.8.19',
        optimizer: true,
        optimizerRuns: 200,
        viaIR: false,
        evmVersion: 'london'
      },
      remappings: {
        'forge-std/': 'lib/forge-std/src/',
        '@openzeppelin/': 'lib/openzeppelin-contracts/'
      },
      metadata: {
        author: 'DappDojo Team',
        version: '1.0.0',
        tags: ['solidity', 'advanced', 'security', 'optimization'],
        estimatedTime: '8-10 hours',
        prerequisites: ['Basic Solidity', 'Smart contract security basics']
      }
    }

    // DeFi Template
    const defiTemplate: CourseTemplate = {
      id: 'solidity-defi',
      name: 'DeFi Protocol Course',
      description: 'Build decentralized finance protocols including DEX, lending, and yield farming',
      category: 'defi',
      difficulty: 'advanced',
      language: 'solidity',
      files: [
        {
          path: 'src/DEX.sol',
          content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DEX is ReentrancyGuard, Ownable {
    IERC20 public tokenA;
    IERC20 public tokenB;
    
    uint256 public reserveA;
    uint256 public reserveB;
    
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public feeRate = 30; // 0.3%
    
    event Swap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    
    event AddLiquidity(
        address indexed user,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );
    
    event RemoveLiquidity(
        address indexed user,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );
    
    constructor(address _tokenA, address _tokenB) {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }
    
    function addLiquidity(uint256 _amountA, uint256 _amountB) external nonReentrant {
        require(_amountA > 0 && _amountB > 0, "Amounts must be greater than 0");
        
        if (reserveA == 0 && reserveB == 0) {
            // Initial liquidity
            reserveA = _amountA;
            reserveB = _amountB;
        } else {
            // Maintain ratio
            uint256 amountBExpected = (_amountA * reserveB) / reserveA;
            require(_amountB >= amountBExpected, "Insufficient token B amount");
            
            if (_amountB > amountBExpected) {
                // Return excess token B
                uint256 excessB = _amountB - amountBExpected;
                tokenB.transfer(msg.sender, excessB);
                _amountB = amountBExpected;
            }
            
            reserveA += _amountA;
            reserveB += _amountB;
        }
        
        tokenA.transferFrom(msg.sender, address(this), _amountA);
        tokenB.transferFrom(msg.sender, address(this), _amountB);
        
        emit AddLiquidity(msg.sender, _amountA, _amountB, 0);
    }
    
    function swap(address _tokenIn, uint256 _amountIn) external nonReentrant {
        require(_amountIn > 0, "Amount must be greater than 0");
        require(_tokenIn == address(tokenA) || _tokenIn == address(tokenB), "Invalid token");
        
        IERC20 tokenIn = IERC20(_tokenIn);
        IERC20 tokenOut = _tokenIn == address(tokenA) ? tokenB : tokenA;
        
        uint256 amountOut = getAmountOut(_amountIn, _tokenIn);
        require(amountOut > 0, "Insufficient liquidity");
        
        tokenIn.transferFrom(msg.sender, address(this), _amountIn);
        tokenOut.transfer(msg.sender, amountOut);
        
        // Update reserves
        if (_tokenIn == address(tokenA)) {
            reserveA += _amountIn;
            reserveB -= amountOut;
        } else {
            reserveB += _amountIn;
            reserveA -= amountOut;
        }
        
        emit Swap(msg.sender, _tokenIn, address(tokenOut), _amountIn, amountOut);
    }
    
    function getAmountOut(uint256 _amountIn, address _tokenIn) public view returns (uint256) {
        if (_tokenIn == address(tokenA)) {
            return getAmountOut(_amountIn, reserveA, reserveB);
        } else {
            return getAmountOut(_amountIn, reserveB, reserveA);
        }
    }
    
    function getAmountOut(uint256 _amountIn, uint256 _reserveIn, uint256 _reserveOut) 
        internal view returns (uint256) {
        require(_amountIn > 0, "Insufficient input amount");
        require(_reserveIn > 0 && _reserveOut > 0, "Insufficient liquidity");
        
        uint256 amountInWithFee = _amountIn * (FEE_DENOMINATOR - feeRate);
        uint256 numerator = amountInWithFee * _reserveOut;
        uint256 denominator = (_reserveIn * FEE_DENOMINATOR) + amountInWithFee;
        
        return numerator / denominator;
    }
    
    function setFeeRate(uint256 _feeRate) external onlyOwner {
        require(_feeRate <= 1000, "Fee rate too high"); // Max 10%
        feeRate = _feeRate;
    }
}`
        },
        {
          path: 'src/LendingPool.sol',
          content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LendingPool is ReentrancyGuard, Ownable {
    IERC20 public token;
    
    uint256 public totalSupply;
    uint256 public totalBorrowed;
    uint256 public utilizationRate;
    uint256 public baseRate = 100; // 1% base rate
    uint256 public slopeRate1 = 200; // 2% slope rate 1
    uint256 public slopeRate2 = 1000; // 10% slope rate 2
    uint256 public optimalUtilization = 8000; // 80%
    
    mapping(address => uint256) public userSupply;
    mapping(address => uint256) public userBorrowed;
    mapping(address => uint256) public userCollateral;
    
    event Supply(address indexed user, uint256 amount);
    event Borrow(address indexed user, uint256 amount);
    event Repay(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    
    constructor(address _token) {
        token = IERC20(_token);
    }
    
    function supply(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");
        
        token.transferFrom(msg.sender, address(this), _amount);
        userSupply[msg.sender] += _amount;
        totalSupply += _amount;
        
        emit Supply(msg.sender, _amount);
    }
    
    function borrow(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= getBorrowableAmount(msg.sender), "Insufficient collateral");
        require(_amount <= getAvailableLiquidity(), "Insufficient liquidity");
        
        userBorrowed[msg.sender] += _amount;
        totalBorrowed += _amount;
        
        token.transfer(msg.sender, _amount);
        
        emit Borrow(msg.sender, _amount);
    }
    
    function repay(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= userBorrowed[msg.sender], "Repay amount exceeds borrowed amount");
        
        token.transferFrom(msg.sender, address(this), _amount);
        userBorrowed[msg.sender] -= _amount;
        totalBorrowed -= _amount;
        
        emit Repay(msg.sender, _amount);
    }
    
    function withdraw(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= userSupply[msg.sender], "Insufficient supply");
        require(_amount <= getAvailableSupply(msg.sender), "Insufficient available supply");
        
        userSupply[msg.sender] -= _amount;
        totalSupply -= _amount;
        
        token.transfer(msg.sender, _amount);
        
        emit Withdraw(msg.sender, _amount);
    }
    
    function getBorrowableAmount(address _user) public view returns (uint256) {
        uint256 collateral = userCollateral[_user];
        uint256 borrowed = userBorrowed[_user];
        uint256 collateralValue = collateral; // Simplified: 1:1 ratio
        
        return collateralValue > borrowed ? collateralValue - borrowed : 0;
    }
    
    function getAvailableLiquidity() public view returns (uint256) {
        return totalSupply - totalBorrowed;
    }
    
    function getAvailableSupply(address _user) public view returns (uint256) {
        uint256 userSupplyAmount = userSupply[_user];
        uint256 utilization = (totalBorrowed * 10000) / totalSupply;
        
        if (utilization < optimalUtilization) {
            return userSupplyAmount;
        } else {
            return (userSupplyAmount * optimalUtilization) / utilization;
        }
    }
    
    function getCurrentRate() public view returns (uint256) {
        uint256 utilization = (totalBorrowed * 10000) / totalSupply;
        
        if (utilization <= optimalUtilization) {
            return baseRate + (slopeRate1 * utilization) / optimalUtilization;
        } else {
            return baseRate + slopeRate1 + (slopeRate2 * (utilization - optimalUtilization)) / (10000 - optimalUtilization);
        }
    }
}`
        },
        {
          path: 'test/DeFiProtocol.t.sol',
          content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/DEX.sol";
import "../src/LendingPool.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10**18);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract DeFiProtocolTest is Test {
    DEX public dex;
    LendingPool public lendingPool;
    MockERC20 public tokenA;
    MockERC20 public tokenB;
    
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    
    function setUp() public {
        tokenA = new MockERC20("Token A", "TKA");
        tokenB = new MockERC20("Token B", "TKB");
        
        dex = new DEX(address(tokenA), address(tokenB));
        lendingPool = new LendingPool(address(tokenA));
        
        // Fund users
        tokenA.mint(user1, 1000 * 10**18);
        tokenA.mint(user2, 1000 * 10**18);
        tokenB.mint(user1, 1000 * 10**18);
        tokenB.mint(user2, 1000 * 10**18);
    }
    
    function testDEXAddLiquidity() public {
        vm.startPrank(user1);
        tokenA.approve(address(dex), 100 * 10**18);
        tokenB.approve(address(dex), 100 * 10**18);
        dex.addLiquidity(100 * 10**18, 100 * 10**18);
        vm.stopPrank();
        
        assertEq(dex.reserveA(), 100 * 10**18);
        assertEq(dex.reserveB(), 100 * 10**18);
    }
    
    function testDEXSwap() public {
        // Add liquidity first
        vm.startPrank(user1);
        tokenA.approve(address(dex), 100 * 10**18);
        tokenB.approve(address(dex), 100 * 10**18);
        dex.addLiquidity(100 * 10**18, 100 * 10**18);
        vm.stopPrank();
        
        // Perform swap
        vm.startPrank(user2);
        tokenA.approve(address(dex), 10 * 10**18);
        dex.swap(address(tokenA), 10 * 10**18);
        vm.stopPrank();
        
        assertTrue(dex.reserveA() > 100 * 10**18);
        assertTrue(dex.reserveB() < 100 * 10**18);
    }
    
    function testLendingPoolSupply() public {
        vm.startPrank(user1);
        tokenA.approve(address(lendingPool), 100 * 10**18);
        lendingPool.supply(100 * 10**18);
        vm.stopPrank();
        
        assertEq(lendingPool.userSupply(user1), 100 * 10**18);
        assertEq(lendingPool.totalSupply(), 100 * 10**18);
    }
    
    function testLendingPoolBorrow() public {
        // Supply first
        vm.startPrank(user1);
        tokenA.approve(address(lendingPool), 100 * 10**18);
        lendingPool.supply(100 * 10**18);
        vm.stopPrank();
        
        // Borrow
        vm.startPrank(user2);
        lendingPool.borrow(50 * 10**18);
        vm.stopPrank();
        
        assertEq(lendingPool.userBorrowed(user2), 50 * 10**18);
        assertEq(lendingPool.totalBorrowed(), 50 * 10**18);
    }
}`
        },
        {
          path: 'README.md',
          content: `# DeFi Protocol Course

## Overview
This course teaches you how to build decentralized finance (DeFi) protocols including DEX, lending pools, and yield farming.

## Learning Objectives
- Understand DeFi protocols and their mechanics
- Build automated market makers (AMMs)
- Implement lending and borrowing systems
- Create yield farming mechanisms
- Master DeFi security patterns

## Course Structure
1. **Decentralized Exchange (DEX)**
   - Automated market maker (AMM) mechanics
   - Liquidity provision and management
   - Swap functionality and pricing
   - Fee structures and optimization

2. **Lending Protocols**
   - Lending and borrowing mechanics
   - Interest rate models
   - Collateral management
   - Liquidation systems

3. **Yield Farming**
   - Liquidity mining
   - Reward distribution
   - Staking mechanisms
   - Governance tokens

4. **Advanced DeFi Concepts**
   - Flash loans
   - Arbitrage strategies
   - MEV (Maximal Extractable Value)
   - Cross-chain protocols

## Prerequisites
- Advanced Solidity knowledge
- Understanding of DeFi concepts
- Experience with complex contract interactions
- Knowledge of economic models

## Getting Started
1. Install dependencies: \`forge install\`
2. Compile contracts: \`forge build\`
3. Run tests: \`forge test\`
4. Deploy to testnet: \`forge script\`

## DeFi Exercises
- Build a complete DEX
- Implement a lending protocol
- Create yield farming contracts
- Develop flash loan functionality
- Build cross-chain bridges

## Security Considerations
- Reentrancy attacks
- Flash loan attacks
- Oracle manipulation
- Economic exploits
- Governance attacks`
        }
      ],
      dependencies: [
        { name: 'forge-std', version: 'latest', source: 'github' },
        { name: 'openzeppelin-contracts', version: 'latest', source: 'github' }
      ],
      foundryConfig: {
        solc: '0.8.19',
        optimizer: true,
        optimizerRuns: 200,
        viaIR: false,
        evmVersion: 'london'
      },
      remappings: {
        'forge-std/': 'lib/forge-std/src/',
        '@openzeppelin/': 'lib/openzeppelin-contracts/'
      },
      metadata: {
        author: 'DappDojo Team',
        version: '1.0.0',
        tags: ['solidity', 'defi', 'dex', 'lending', 'yield-farming'],
        estimatedTime: '12-15 hours',
        prerequisites: ['Advanced Solidity', 'DeFi concepts', 'Economic models']
      }
    }

    // Store templates
    this.templates.set('solidity-basic', basicTemplate)
    this.templates.set('solidity-advanced', advancedTemplate)
    this.templates.set('solidity-defi', defiTemplate)
  }

  /**
   * Get all available templates
   */
  getAllTemplates(): CourseTemplate[] {
    return Array.from(this.templates.values())
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): CourseTemplate | null {
    return this.templates.get(id) || null
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): CourseTemplate[] {
    return this.getAllTemplates().filter(template => template.category === category)
  }

  /**
   * Get templates by difficulty
   */
  getTemplatesByDifficulty(difficulty: string): CourseTemplate[] {
    return this.getAllTemplates().filter(template => template.difficulty === difficulty)
  }

  /**
   * Get templates by language
   */
  getTemplatesByLanguage(language: string): CourseTemplate[] {
    return this.getAllTemplates().filter(template => template.language === language)
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): CourseTemplate[] {
    const lowercaseQuery = query.toLowerCase()
    return this.getAllTemplates().filter(template => 
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.metadata.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    )
  }

  /**
   * Apply template to course project
   */
  async applyTemplate(templateId: string, projectPath: string): Promise<boolean> {
    try {
      const template = this.getTemplate(templateId)
      if (!template) {
        throw new Error(`Template ${templateId} not found`)
      }

      // Create project directory
      await fs.mkdir(projectPath, { recursive: true })

      // Create files
      for (const file of template.files) {
        const filePath = path.join(projectPath, file.path)
        const fileDir = path.dirname(filePath)
        
        // Create directory if it doesn't exist
        await fs.mkdir(fileDir, { recursive: true })
        
        // Write file
        await fs.writeFile(filePath, file.content, 'utf8')
      }

      // Create foundry.toml
      const foundryTomlPath = path.join(projectPath, 'foundry.toml')
      const foundryToml = this.generateFoundryToml(template.foundryConfig)
      await fs.writeFile(foundryTomlPath, foundryToml, 'utf8')

      // Create remappings.txt
      const remappingsPath = path.join(projectPath, 'remappings.txt')
      const remappingsContent = this.generateRemappings(template.remappings)
      await fs.writeFile(remappingsPath, remappingsContent, 'utf8')

      return true
    } catch (error) {
      console.error('Error applying template:', error)
      return false
    }
  }

  /**
   * Generate foundry.toml content
   */
  private generateFoundryToml(config: any): string {
    let toml = '[profile.default]\n'
    toml += `src = "src"\n`
    toml += `out = "out"\n`
    toml += `libs = ["lib"]\n`
    toml += `solc = "${config.solc}"\n`
    toml += `optimizer = ${config.optimizer}\n`
    toml += `optimizer_runs = ${config.optimizerRuns}\n`
    
    if (config.viaIR) {
      toml += `via_ir = ${config.viaIR}\n`
    }
    
    if (config.evmVersion) {
      toml += `evm_version = "${config.evmVersion}"\n`
    }
    
    return toml
  }

  /**
   * Generate remappings.txt content
   */
  private generateRemappings(remappings: Record<string, string>): string {
    let content = ''
    for (const [key, value] of Object.entries(remappings)) {
      content += `${key} ${value}\n`
    }
    return content
  }
}

export const templateManager = new TemplateManager()
