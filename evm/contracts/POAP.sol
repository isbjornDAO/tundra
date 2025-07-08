// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "./SoulboundNFT.sol";

contract POAP is SoulboundNFT {
    constructor(
        address owner
    ) SoulboundNFT("My Soulbound NFT", "MSBT", owner) {}
}
