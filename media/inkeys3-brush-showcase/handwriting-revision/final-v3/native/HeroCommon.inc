// 读回与 PNG 保存：沿用 inkeys3-features 适配器的直通 alpha 转换，避免透明边缘二次预乘变暗。
namespace HeroIo
{
	using Path = std::filesystem::path;
	using Clock = std::chrono::steady_clock;
	HRESULT SavePixels(const Path& path, UINT width, UINT height, UINT pitch, const BYTE* pixels)
	{
		// D2D / Draw3 读回是预乘 BGRA；PNG 存直通 alpha，避免网页合成暗边。
		std::vector<BYTE> straight(width * height * 4);
		for (UINT y = 0; y < height; ++y) for (UINT x = 0; x < width; ++x)
		{
			const auto* src = pixels + y * pitch + x * 4;
			auto* dst = straight.data() + (y * width + x) * 4;
			dst[3] = src[3];
			for (int c = 0; c < 3; ++c) dst[c] = src[3] ? static_cast<BYTE>((std::min)(255U, (src[c] * 255U + src[3] / 2U) / src[3])) : 0;
		}
		ComPtr<IWICImagingFactory> factory; ComPtr<IWICStream> stream;
		ComPtr<IWICBitmapEncoder> encoder; ComPtr<IWICBitmapFrameEncode> frame; ComPtr<IPropertyBag2> options;
		HRESULT hr = CoCreateInstance(CLSID_WICImagingFactory, nullptr, CLSCTX_INPROC_SERVER, IID_PPV_ARGS(&factory));
		if (SUCCEEDED(hr)) hr = factory->CreateStream(&stream);
		if (SUCCEEDED(hr)) hr = stream->InitializeFromFilename(path.c_str(), GENERIC_WRITE);
		if (SUCCEEDED(hr)) hr = factory->CreateEncoder(GUID_ContainerFormatPng, nullptr, &encoder);
		if (SUCCEEDED(hr)) hr = encoder->Initialize(stream.Get(), WICBitmapEncoderNoCache);
		if (SUCCEEDED(hr)) hr = encoder->CreateNewFrame(&frame, &options);
		if (SUCCEEDED(hr)) hr = frame->Initialize(options.Get());
		if (SUCCEEDED(hr)) hr = frame->SetSize(width, height);
		WICPixelFormatGUID format = GUID_WICPixelFormat32bppBGRA;
		if (SUCCEEDED(hr)) hr = frame->SetPixelFormat(&format);
		if (SUCCEEDED(hr)) hr = frame->WritePixels(height, width * 4, static_cast<UINT>(straight.size()), straight.data());
		if (SUCCEEDED(hr)) hr = frame->Commit();
		if (SUCCEEDED(hr)) hr = encoder->Commit();
		return hr;
	}
	HRESULT SaveTarget(ID2D1DeviceContext* dc, ID2D1Bitmap1* source, const Path& path)
	{
		if (!source) return E_POINTER;
		ComPtr<ID2D1Bitmap1> readable;
		const auto props = D2D1::BitmapProperties1(D2D1_BITMAP_OPTIONS_CPU_READ | D2D1_BITMAP_OPTIONS_CANNOT_DRAW, source->GetPixelFormat());
		HRESULT hr = dc->CreateBitmap(source->GetPixelSize(), nullptr, 0, &props, &readable);
		if (SUCCEEDED(hr)) hr = readable->CopyFromBitmap(nullptr, source, nullptr);
		D2D1_MAPPED_RECT map{};
		if (SUCCEEDED(hr)) hr = readable->Map(D2D1_MAP_OPTIONS_READ, &map);
		if (FAILED(hr)) return hr;
		const auto size = source->GetPixelSize();
		hr = SavePixels(path, size.width, size.height, map.pitch, map.bits);
		readable->Unmap(); return hr;
	}
}
