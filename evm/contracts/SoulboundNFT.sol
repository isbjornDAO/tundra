// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract SoulboundNFT is ERC721, Ownable {
    uint256 public nextTokenId;

    string private _baseTokenURI;

    mapping(uint256 => bool) public minted;

    constructor(
        string memory name,
        string memory symbol,
        address owner
    ) ERC721(name, symbol) Ownable(owner) {}

    function mint(address to) external onlyOwner {
        uint256 tokenId = nextTokenId;
        minted[tokenId] = true;
        nextTokenId++;
        _safeMint(to, tokenId);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721) returns (address) {
        address from = _ownerOf(tokenId);

        if (from != address(0)) {
            revert("Soulbound: transfer disabled");
        }

        return super._update(to, tokenId, auth);
    }

    function approve(address to, uint256 tokenId) public virtual override {
        revert("Soulbound: Approvals disabled");
    }

    function setApprovalForAll(
        address operator,
        bool approved
    ) public virtual override {
        revert("Soulbound: Approvals disabled");
    }

    function setBaseURI(string memory newBaseURI) public onlyOwner {
        _baseTokenURI = newBaseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}
